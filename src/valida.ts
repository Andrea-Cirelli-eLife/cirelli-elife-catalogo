/**
 * Riepilogo del catalogo generato: `npm run valida`.
 * La validazione vera avviene in `npm run genera`, che fallisce se un dato non
 * torna; qui si stampa il risultato e la lista di ciò che resta da confermare.
 */
import { catalogo } from "./index.ts";
import { oggiISO, prossimeEdizioni } from "./helpers.ts";

const prossime = prossimeEdizioni(catalogo, oggiISO());
console.log("Catalogo valido.");
console.log(
  `  ${catalogo.corsi.length} corsi · ${catalogo.edizioni.length} edizioni ` +
    `(${prossime.length} acquistabili) · ${catalogo.percorsi.length} percorsi · ` +
    `${catalogo.sedi.length} sedi · ${catalogo.docenti.length} docenti`,
);

const daConfermare = [
  ...catalogo.corsi,
  ...catalogo.edizioni,
  ...catalogo.percorsi,
  ...catalogo.sedi,
  ...catalogo.docenti,
].flatMap((v) => v.daConfermare.map((d) => `${v.id}: ${d}`));

if (daConfermare.length > 0) {
  console.log(`\n${daConfermare.length} punti ancora da confermare col cliente:`);
  for (const d of daConfermare) console.log(`  · ${d}`);
}
