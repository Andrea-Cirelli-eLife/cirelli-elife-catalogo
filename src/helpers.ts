import type { Catalogo } from "./verifica.ts";
import type { Corso, Edizione, Percorso } from "./schema.ts";

/** Data di oggi in formato YYYY-MM-DD, sul fuso di Roma: i siti si buildano
 *  anche su runner in UTC, e una differenza di fuso può far scadere un early
 *  bird con un giorno di anticipo. */
export function oggiISO(adesso: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(adesso);
}

export type Tariffa = "early" | "pieno";

export interface PrezzoCorrente {
  importo: number;
  tariffa: Tariffa;
  /** Presente solo finché l'early bird è ancora attivo. */
  scadenzaEarly?: string;
  /** Quanto si risparmia oggi rispetto al prezzo pieno. */
  risparmio: number;
}

/**
 * Prezzo applicabile a un'edizione in una data data. L'eventuale prezzo
 * dell'edizione sovrascrive quello di listino del corso; l'early bird vale
 * fino a tutto il giorno di scadenza.
 */
export function prezzoCorrente(
  edizione: Edizione,
  corso: Corso,
  oggi: string = oggiISO(),
): PrezzoCorrente {
  const prezzo = edizione.prezzo ?? corso.prezzo;
  if (!prezzo) {
    throw new Error(
      `Nessun prezzo per l'edizione "${edizione.id}": manca sia sull'edizione sia sul corso "${corso.id}"`,
    );
  }

  const earlyAttivo =
    prezzo.early !== undefined &&
    edizione.earlyBirdFino !== undefined &&
    oggi <= edizione.earlyBirdFino;

  if (earlyAttivo) {
    return {
      importo: prezzo.early!,
      tariffa: "early",
      scadenzaEarly: edizione.earlyBirdFino,
      risparmio: prezzo.pieno - prezzo.early!,
    };
  }
  return { importo: prezzo.pieno, tariffa: "pieno", risparmio: 0 };
}

/** Un'edizione è acquistabile se è aperta e non è già cominciata. */
export function acquistabile(edizione: Edizione, oggi: string = oggiISO()): boolean {
  return edizione.stato === "aperta" && edizione.dal > oggi;
}

export function edizioniDi(catalogo: Catalogo, corsoId: string): Edizione[] {
  return catalogo.edizioni.filter((e) => e.corso === corsoId);
}

/** Le edizioni acquistabili, in ordine cronologico: è la vista che serve al
 *  calendario di entrambi i siti. */
export function prossimeEdizioni(catalogo: Catalogo, oggi: string = oggiISO()): Edizione[] {
  return catalogo.edizioni.filter((e) => acquistabile(e, oggi));
}

/** La prossima edizione utile di un corso, se esiste: guida il CTA della scheda. */
export function prossimaEdizioneDi(
  catalogo: Catalogo,
  corsoId: string,
  oggi: string = oggiISO(),
): Edizione | undefined {
  return edizioniDi(catalogo, corsoId).find((e) => acquistabile(e, oggi));
}

export function corsiDelPercorso(catalogo: Catalogo, percorso: Percorso): Corso[] {
  const ids = [...percorso.comprende.corsi, ...percorso.comprende.master];
  return ids
    .map((id) => catalogo.corsi.find((c) => c.id === id))
    .filter((c): c is Corso => c !== undefined);
}

/**
 * Quanto costerebbe, comprato corso per corso, il programma di un percorso.
 *
 * Se il percorso dichiara un `valorePieno`, vince quello: è il conto della
 * scuola, che applica sconti di combinazione (le due Tipologie umane insieme, i
 * due Master insieme) non modellati sui singoli corsi. Sommare i listini
 * darebbe un numero più alto, e comunicare un risparmio più grande di quello
 * che il cliente stesso calcola.
 *
 * Senza `valorePieno` si somma il listino: i corsi senza prezzo valgono zero,
 * quindi il risparmio resta per difetto, mai gonfiato.
 */
export function valoreListino(catalogo: Catalogo, percorso: Percorso): number {
  if (percorso.valorePieno !== undefined) return percorso.valorePieno;
  return corsiDelPercorso(catalogo, percorso).reduce(
    (somma, corso) => somma + (corso.prezzo?.pieno ?? 0),
    0,
  );
}

export function risparmioPercorso(catalogo: Catalogo, percorso: Percorso): number {
  return Math.max(0, valoreListino(catalogo, percorso) - percorso.prezzo.pieno);
}

/** Un corso è accessibile solo se tutti i suoi prerequisiti sono stati frequentati. */
export function prerequisitiMancanti(
  catalogo: Catalogo,
  corsoId: string,
  giaFrequentati: readonly string[],
): string[] {
  const corso = catalogo.corsi.find((c) => c.id === corsoId);
  if (!corso) return [];
  return corso.prerequisiti.filter((p) => !giaFrequentati.includes(p));
}

const EURO = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formattaPrezzo(importo: number): string {
  return EURO.format(importo);
}

const GIORNO = new Intl.DateTimeFormat("it-IT", { day: "numeric", timeZone: "Europe/Rome" });
const GIORNO_MESE = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", timeZone: "Europe/Rome" });
const COMPLETA = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" });

function aData(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** "20 settembre 2026". */
export function formattaData(iso: string): string {
  return COMPLETA.format(aData(iso));
}

/**
 * "3 ottobre 2026", "31 ottobre – 1 novembre 2026", "17–18 ottobre 2026".
 * Ripete mese e anno solo quando cambiano davvero.
 */
export function formattaPeriodo(dal: string, al: string): string {
  const inizio = aData(dal);
  const fine = aData(al);
  if (dal === al) return formattaData(dal);

  const stessoAnno = dal.slice(0, 4) === al.slice(0, 4);
  const stessoMese = stessoAnno && dal.slice(5, 7) === al.slice(5, 7);

  if (stessoMese) return `${GIORNO.format(inizio)}–${COMPLETA.format(fine)}`;
  if (stessoAnno) return `${GIORNO_MESE.format(inizio)} – ${COMPLETA.format(fine)}`;
  return `${COMPLETA.format(inizio)} – ${COMPLETA.format(fine)}`;
}

/** Giorni pieni che mancano a una data. Negativo se è già passata. */
export function giorniA(data: string, oggi: string = oggiISO()): number {
  return Math.round((aData(data).getTime() - aData(oggi).getTime()) / 86_400_000);
}
