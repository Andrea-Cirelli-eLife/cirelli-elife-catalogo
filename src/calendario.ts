/**
 * Il calendario della Scuola di Coaching: tipo e stato di ogni edizione, open day e
 * inizio dell'anno formativo. Nato in elifelab-it (16 novembre 2026) per
 * /calendario-accademico e /scuola-di-coaching, portato qui il 19 novembre 2026
 * perché anche andreacirelli.it ha la sua pagina della Scuola: stessa logica e
 * stesse etichette sui due siti.
 *
 * Un'edizione è «confermata» quando non ha punti da confermare che chi legge deve
 * sapere: data, orario, sede, programma. I `daConfermare` interni (posti, early bird,
 * testi della consulenza, piattaforma del webinar) non contano.
 */
import type { Catalogo } from "./verifica.ts";
import type { Corso, Edizione, Sede } from "./schema.ts";
import { acquistabile, oggiISO } from "./helpers.ts";

export const tipoDi: Record<Corso["famiglia"], string> = {
  "workshop-intro": "Workshop",
  "workshop-porta": "Workshop",
  corso: "Modulo",
  master: "Master",
  "open-day": "Open day",
};

/* Solo le voci secche («Orario», «Sede»): una voce con un dettaglio («Orario del pranzo
   di lunedì 7: …») è una nota per il team e in pagina non va (18 novembre 2026). */
const PUBBLICI = /^(data|date|orario|sede|programma)$/i;

/** Confermata o no, e cosa manca ancora detto a chi legge («data», «orario»). */
export function statoEdizione(e: Edizione): { confermata: boolean; mancano: string[] } {
  const mancano = e.daConfermare.map((d) => d.trim()).filter((d) => PUBBLICI.test(d)).map((d) => d.toLowerCase());
  if (e.stato === "bozza") mancano.unshift("data");
  return { confermata: mancano.length === 0, mancano: [...new Set(mancano)] };
}

/** L'etichetta di stato in pagina: «Confermata» o «Da definire: data, orario». */
export function etichettaStato(e: Edizione): string {
  const s = statoEdizione(e);
  return s.confermata ? "Confermata" : `Da definire: ${s.mancano.join(", ")}`;
}

export const corsoDiEdizione = (catalogo: Catalogo, e: Edizione): Corso =>
  catalogo.corsi.find((c) => c.id === e.corso)!;

export const sedeDiEdizione = (catalogo: Catalogo, e: Edizione): Sede | undefined =>
  catalogo.sedi.find((s) => s.id === e.sede);

/** Dove si tiene, in breve: «Online», «Desenzano del Garda», «Brescia». */
export const luogoEdizione = (catalogo: Catalogo, e: Edizione): string =>
  e.formato === "online" ? "Online" : sedeDiEdizione(catalogo, e)?.citta ?? "";

/** Le edizioni da `dal` a `al` compresi (YYYY-MM-DD), in ordine di data, senza le chiuse. */
export const edizioniFra = (catalogo: Catalogo, dal: string, al: string): Edizione[] =>
  catalogo.edizioni.filter((e) => e.al >= dal && e.dal <= al && e.stato !== "chiusa");

/** Gli open day della Scuola a cui ci si può ancora iscrivere, in ordine di data. */
export const openDayAperti = (catalogo: Catalogo, oggi: string = oggiISO()): Edizione[] =>
  catalogo.edizioni.filter((e) => acquistabile(e, oggi) && corsoDiEdizione(catalogo, e).famiglia === "open-day");

/** L'anno formativo della Scuola, dal primo percorso che lo dichiara. */
export function annoScuola(catalogo: Catalogo): { nome: string; inizio: string } | undefined {
  return [...catalogo.percorsi].sort((a, b) => a.ordine - b.ordine).find((p) => p.annoFormativo)?.annoFormativo;
}
