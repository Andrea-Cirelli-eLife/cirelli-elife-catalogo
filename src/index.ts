/**
 * Catalogo condiviso Andrea Cirelli / eLife.
 *
 * Fonte unica dei corsi, delle edizioni e dei percorsi per andreacirelli.it e
 * elifelab.it. I dati stanno in `catalogo/**.yaml` e vengono validati con Zod
 * in fase di build (`npm run genera`): un dato incoerente fa fallire il build,
 * non la pagina in produzione.
 *
 * Qui dentro non si legge dal filesystem: il modulo funziona anche dentro un
 * Worker Cloudflare.
 */
import { generato } from "./generato.ts";

export const catalogo = generato;

export const { corsi, edizioni, percorsi, sedi, docenti } = catalogo;

export type { Catalogo, Grezzo } from "./verifica.ts";
export { ErroreCatalogo, verificaCatalogo } from "./verifica.ts";
export * from "./helpers.ts";
export type {
  Corso,
  Docente,
  Edizione,
  Famiglia,
  Formato,
  Percorso,
  Porta,
  Prezzo,
  Sede,
  StatoEdizione,
} from "./schema.ts";
