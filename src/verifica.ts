import type { z } from "zod";
import { Corso, Docente, Edizione, Percorso, Sede } from "./schema.ts";

export class ErroreCatalogo extends Error {
  readonly problemi: string[];

  constructor(problemi: string[]) {
    super(
      `Catalogo non valido — ${problemi.length} ${problemi.length === 1 ? "problema" : "problemi"}:\n` +
        problemi.map((p) => `  · ${p}`).join("\n"),
    );
    this.name = "ErroreCatalogo";
    this.problemi = problemi;
  }
}

/** Le voci grezze di una collezione, così come escono dal parser YAML. */
export type Grezzo = Record<string, { nome: string; dato: unknown }[]>;

function valida<S extends z.ZodTypeAny>(
  collezione: string,
  voci: { nome: string; dato: unknown }[],
  schema: S,
  problemi: string[],
): z.infer<S>[] {
  const esiti: z.infer<S>[] = [];
  for (const { nome, dato } of voci) {
    const esito = schema.safeParse(dato);
    if (!esito.success) {
      for (const issue of esito.error.issues) {
        const campo = issue.path.join(".") || "(radice)";
        problemi.push(`catalogo/${collezione}/${nome} → ${campo}: ${issue.message}`);
      }
      continue;
    }
    esiti.push(esito.data);
  }
  return esiti;
}

/** Ogni id deve comparire una volta sola dentro la sua collezione. */
function verificaIdUnici(
  collezione: string,
  voci: { id: string }[],
  problemi: string[],
): void {
  const visti = new Set<string>();
  for (const v of voci) {
    if (visti.has(v.id)) problemi.push(`${collezione}: id duplicato "${v.id}"`);
    visti.add(v.id);
  }
}

/** Un riferimento a un id che non esiste è l'errore più probabile quando lo
 *  staff aggiunge un'edizione dal CMS: va intercettato al build, non in pagina. */
function verificaRiferimenti(
  origine: string,
  campo: string,
  riferimenti: readonly string[],
  disponibili: Set<string>,
  problemi: string[],
): void {
  for (const r of riferimenti) {
    if (!disponibili.has(r)) {
      problemi.push(`${origine} → ${campo}: "${r}" non esiste in catalogo`);
    }
  }
}

export interface Catalogo {
  corsi: Corso[];
  edizioni: Edizione[];
  percorsi: Percorso[];
  sedi: Sede[];
  docenti: Docente[];
}

/**
 * Valida le collezioni grezze e ne verifica l'integrità referenziale.
 * Non tocca il filesystem: la lettura dei YAML sta in `scripts/genera.ts`, così
 * il pacchetto pubblicato gira anche dentro un Worker Cloudflare.
 */
export function verificaCatalogo(grezzo: Grezzo): Catalogo {
  const problemi: string[] = [];

  const corsi = valida("corsi", grezzo.corsi ?? [], Corso, problemi);
  const edizioni = valida("edizioni", grezzo.edizioni ?? [], Edizione, problemi);
  const percorsi = valida("percorsi", grezzo.percorsi ?? [], Percorso, problemi);
  const sedi = valida("sedi", grezzo.sedi ?? [], Sede, problemi);
  const docenti = valida("docenti", grezzo.docenti ?? [], Docente, problemi);

  verificaIdUnici("corsi", corsi, problemi);
  verificaIdUnici("edizioni", edizioni, problemi);
  verificaIdUnici("percorsi", percorsi, problemi);
  verificaIdUnici("sedi", sedi, problemi);
  verificaIdUnici("docenti", docenti, problemi);

  const idCorsi = new Set(corsi.map((c) => c.id));
  const idSedi = new Set(sedi.map((s) => s.id));
  const idDocenti = new Set(docenti.map((d) => d.id));

  for (const c of corsi) {
    verificaRiferimenti(`corso "${c.id}"`, "prerequisiti", c.prerequisiti, idCorsi, problemi);
    verificaRiferimenti(`corso "${c.id}"`, "docenti", c.docenti, idDocenti, problemi);
    if (c.prerequisiti.includes(c.id)) {
      problemi.push(`corso "${c.id}": è prerequisito di se stesso`);
    }
  }

  for (const e of edizioni) {
    verificaRiferimenti(`edizione "${e.id}"`, "corso", [e.corso], idCorsi, problemi);
    verificaRiferimenti(`edizione "${e.id}"`, "sede", [e.sede], idSedi, problemi);
    if (e.docenti) {
      verificaRiferimenti(`edizione "${e.id}"`, "docenti", e.docenti, idDocenti, problemi);
    }
    const corso = corsi.find((c) => c.id === e.corso);
    if (corso && !corso.prezzo && !e.prezzo) {
      problemi.push(
        `edizione "${e.id}": né il corso "${e.corso}" né l'edizione hanno un prezzo`,
      );
    }
  }

  for (const p of percorsi) {
    verificaRiferimenti(`percorso "${p.id}"`, "comprende.corsi", p.comprende.corsi, idCorsi, problemi);
    verificaRiferimenti(`percorso "${p.id}"`, "comprende.master", p.comprende.master, idCorsi, problemi);
    for (const m of p.comprende.master) {
      const corso = corsi.find((c) => c.id === m);
      if (corso && corso.famiglia !== "master") {
        problemi.push(`percorso "${p.id}": "${m}" è elencato fra i master ma è di famiglia "${corso.famiglia}"`);
      }
    }
    if (p.rate) {
      const totaleRate = p.rate.numero * p.rate.importo + (p.rate.anticipo ?? 0);
      if (totaleRate < p.prezzo.pieno) {
        problemi.push(
          `percorso "${p.id}": il piano rate copre ${totaleRate} € su ${p.prezzo.pieno} €`,
        );
      }
    }
  }

  if (problemi.length > 0) throw new ErroreCatalogo(problemi);

  const perOrdine = <T extends { ordine: number }>(a: T, b: T) => a.ordine - b.ordine;
  return {
    corsi: corsi.sort(perOrdine),
    edizioni: edizioni.sort((a, b) => a.dal.localeCompare(b.dal)),
    percorsi: percorsi.sort(perOrdine),
    sedi,
    docenti,
  };
}
