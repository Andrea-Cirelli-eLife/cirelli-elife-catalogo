# Catalogo corsi — Andrea Cirelli / eLife

Fonte unica dei corsi, delle edizioni e dei percorsi formativi della scuola di Tripnosi.
È il pacchetto che alimenta [andreacirelli.it](https://andreacirelli.it) e
[elifelab.it](https://elifelab.it): gli stessi dati, agli stessi prezzi, alle stesse
date, senza possibilità di divergere.

```
catalogo/
  corsi/       anagrafica didattica, indipendente dalle date
  edizioni/    le occorrenze datate — ciò che si vende
  percorsi/    annuale, biennale, top di gamma
  sedi/        dove si tengono i corsi
  docenti/     chi li conduce
src/           schema Zod, verifica, helper di prezzo e calendario
scripts/       generazione del modulo dati dai YAML
```

## Corso ≠ edizione

È la distinzione su cui poggia tutto il resto.

- Un **corso** è «Il linguaggio dell'inconscio, 2 giorni, 560/440 €»: descrizione,
  obiettivi, prerequisiti. Non cambia da un anno all'altro.
- Un'**edizione** è «31 ottobre – 1 novembre 2026, Tenuta Urbana, 30 posti, early bird
  fino al 10 ottobre». Cambia a ogni ciclo formativo.

Modellarlo al contrario obbliga a riscrivere il catalogo al secondo anno di scuola.

## Uso

```json
"@cirelli/catalogo": "github:Andrea-Cirelli-eLife/cirelli-elife-catalogo#main"
```

```ts
import { corsi, prossimeEdizioni, prezzoCorrente, formattaPeriodo } from "@cirelli/catalogo";

const edizione = prossimeEdizioni(catalogo)[0];
const { importo, tariffa, risparmio } = prezzoCorrente(edizione, corso);
```

I dati vengono validati con Zod **in fase di build**: un'edizione che punta a un corso
inesistente, un early bird che scade dopo l'inizio o un prezzo scontato più alto di
quello pieno fanno fallire il build, non la pagina in produzione.

`npm run genera` legge i YAML, li valida e ne emette un modulo TypeScript in
`src/generato.ts`. È l'unico punto che tocca il filesystem: ciò che i siti importano
sono dati letterali, senza `fs`, così lo stesso catalogo gira in un build Astro, in un
bundle Vite e dentro un Worker Cloudflare.

## Comandi

```bash
npm run genera      # rilegge i YAML, valida, riscrive src/generato.ts
npm run valida      # come sopra, con riepilogo e punti ancora da confermare
npm run typecheck   # controllo dei tipi
npm run build       # genera + compila src/ in dist/
```

La validazione fallisce elencando **tutti** i problemi trovati, non solo il primo.

## Il campo `daConfermare`

Ogni voce può portare una lista `daConfermare`: dati ipotizzati o ricostruiti, in attesa
di conferma. `npm run valida` li elenca in fondo all'output. Non bloccano il build —
servono a non lasciarli scivolare in produzione per inerzia.

---

I contenuti dei corsi sono proprietà del dott. Andrea Cirelli e di eLife — Entanglement
Life APS. Il codice è pubblicato perché è una dipendenza di build dei due siti.
