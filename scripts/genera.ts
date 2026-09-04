/**
 * Legge i YAML di `catalogo/`, li valida e ne emette un modulo TypeScript in
 * `src/generato.ts`.
 *
 * È l'unico punto del pacchetto che tocca il filesystem, e gira solo in fase di
 * build. Il modulo generato contiene dati letterali: i siti lo importano senza
 * `fs`, così lo stesso catalogo funziona in un build Astro, in un bundle Vite e
 * dentro un Worker Cloudflare.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { ErroreCatalogo, verificaCatalogo, type Grezzo } from "../src/verifica.ts";

const RADICE = fileURLToPath(new URL("../catalogo/", import.meta.url));
const USCITA = fileURLToPath(new URL("../src/generato.ts", import.meta.url));

const COLLEZIONI = ["corsi", "edizioni", "percorsi", "sedi", "docenti"] as const;

function leggi(cartella: string): { nome: string; dato: unknown }[] {
  const percorso = join(RADICE, cartella);
  return readdirSync(percorso)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((nome) => ({
      nome,
      dato: parseYaml(readFileSync(join(percorso, nome), "utf8")),
    }));
}

const grezzo: Grezzo = Object.fromEntries(
  COLLEZIONI.map((c) => [c, leggi(c)]),
);

let catalogo;
try {
  catalogo = verificaCatalogo(grezzo);
} catch (e) {
  if (e instanceof ErroreCatalogo) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}

const intestazione = `// GENERATO AUTOMATICAMENTE — non modificare a mano.
// Sorgente: catalogo/**/*.yaml · rigenera con \`npm run genera\`.
import type { Catalogo } from "./verifica.ts";

export const generato: Catalogo = `;

writeFileSync(
  USCITA,
  `${intestazione}${JSON.stringify(catalogo, null, 2)};\n`,
  "utf8",
);

console.log(
  `src/generato.ts scritto — ${catalogo.corsi.length} corsi, ` +
    `${catalogo.edizioni.length} edizioni, ${catalogo.percorsi.length} percorsi, ` +
    `${catalogo.sedi.length} sedi, ${catalogo.docenti.length} docenti.`,
);
