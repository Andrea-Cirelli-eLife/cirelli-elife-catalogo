import { z } from "zod";

/** Slug in kebab-case: è l'identificatore usato anche negli URL dei due siti. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "deve essere uno slug kebab-case");

/** Data ISO senza orario. Il confronto lessicografico fra due stringhe così
 *  formate coincide con il confronto cronologico: ci appoggiamo a questo. */
export const DataISO = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "deve essere una data YYYY-MM-DD");

export const Prezzo = z
  .object({
    pieno: z.number().int().positive(),
    early: z.number().int().positive().optional(),
  })
  .refine((p) => p.early === undefined || p.early < p.pieno, {
    message: "il prezzo early bird deve essere inferiore al prezzo pieno",
  });

export const Famiglia = z.enum([
  "workshop-intro",
  "workshop-porta",
  "corso",
  "master",
]);

/** Le due "porte" d'ingresso al percorso: ottenere il meglio da sé o dagli altri. */
export const Porta = z.enum(["se", "altri"]);

export const Formato = z.enum(["presenza", "residenziale", "serale", "online"]);

export const StatoEdizione = z.enum(["bozza", "aperta", "esaurita", "chiusa"]);

/** Anagrafica didattica di un corso, indipendente dalle date in cui viene erogato. */
export const Corso = z.object({
  id: Slug,
  titolo: z.string().min(1),
  sottotitolo: z.string().optional(),
  famiglia: Famiglia,
  ordine: z.number().int().nonnegative(),
  durataGiorni: z.number().positive(),
  /** Sfumature che il solo numero di giorni non regge: "2+2 giorni oppure 4 residenziali". */
  durataNota: z.string().optional(),
  /** Assente per i master, che a listino non si vendono singolarmente. */
  prezzo: Prezzo.optional(),
  includeConsulenza: z.boolean().default(false),
  prerequisiti: z.array(Slug).default([]),
  porta: Porta.nullable().default(null),
  docenti: z.array(Slug).default([]),
  /** Una o due frasi per le card di elenco. */
  abstract: z.string().optional(),
  descrizione: z.string().optional(),
  obiettivi: z.array(z.string()).default([]),
  programma: z.array(z.string()).default([]),
  daConfermare: z.array(z.string()).default([]),
});

/** L'occorrenza datata di un corso: è questa che si vende. */
export const Edizione = z
  .object({
    id: Slug,
    corso: Slug,
    dal: DataISO,
    al: DataISO,
    sede: Slug,
    formato: Formato,
    posti: z.number().int().positive(),
    earlyBirdFino: DataISO.optional(),
    /** Override del prezzo di listino del corso, per edizioni fuori standard. */
    prezzo: Prezzo.optional(),
    /** Override dei docenti del corso: i workshop porta li conduce lo staff. */
    docenti: z.array(Slug).optional(),
    stato: StatoEdizione,
    note: z.string().optional(),
    daConfermare: z.array(z.string()).default([]),
  })
  .refine((e) => e.al >= e.dal, {
    message: "la data di fine non può precedere quella di inizio",
  })
  .refine((e) => !e.earlyBirdFino || e.earlyBirdFino < e.dal, {
    message: "l'early bird deve scadere prima dell'inizio dell'edizione",
  });

/** I pacchetti annuale, biennale e top di gamma. */
export const Percorso = z.object({
  id: Slug,
  titolo: z.string().min(1),
  sottotitolo: z.string().optional(),
  ordine: z.number().int().nonnegative(),
  durata: z.enum(["annuale", "biennale"]),
  prezzo: Prezzo,
  /**
   * Quanto costerebbe lo stesso programma comprato corso per corso, come lo
   * calcola la scuola. Non coincide con la somma dei listini: la scuola applica
   * sconti di combinazione — le due Tipologie umane insieme, i due Master
   * insieme — che qui non sono modellati corso per corso. Quando c'è, è questo
   * il numero da mostrare accanto al prezzo del percorso, perché è quello su
   * cui il cliente ha costruito la propria percentuale di sconto.
   */
  valorePieno: z.number().int().positive().optional(),
  comprende: z.object({
    corsi: z.array(Slug).default([]),
    master: z.array(Slug).default([]),
    /** Ciò che non è un corso a catalogo: rifrequenza attiva, tesina, supervisione. */
    extra: z.array(z.string()).default([]),
  }),
  rate: z
    .object({
      numero: z.number().int().positive(),
      importo: z.number().positive(),
      anticipo: z.number().nonnegative().optional(),
    })
    .optional(),
  descrizione: z.string().optional(),
  daConfermare: z.array(z.string()).default([]),
}).refine((p) => p.valorePieno === undefined || p.valorePieno > p.prezzo.pieno, {
  message: "il valore a listino deve essere superiore al prezzo del percorso",
  path: ["valorePieno"],
});

export const Sede = z.object({
  id: Slug,
  nome: z.string().min(1),
  indirizzo: z.string().min(1),
  cap: z.string().regex(/^\d{5}$/),
  citta: z.string().min(1),
  provincia: z.string().length(2),
  comeArrivare: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  sito: z.string().url().optional(),
  mappa: z.string().url().optional(),
  daConfermare: z.array(z.string()).default([]),
});

export const Docente = z.object({
  id: Slug,
  nome: z.string().min(1),
  ruolo: z.string().optional(),
  bio: z.string().optional(),
  foto: z.string().optional(),
  daConfermare: z.array(z.string()).default([]),
});

export type Corso = z.infer<typeof Corso>;
export type Edizione = z.infer<typeof Edizione>;
export type Percorso = z.infer<typeof Percorso>;
export type Sede = z.infer<typeof Sede>;
export type Docente = z.infer<typeof Docente>;
export type Prezzo = z.infer<typeof Prezzo>;
export type Famiglia = z.infer<typeof Famiglia>;
export type Formato = z.infer<typeof Formato>;
export type StatoEdizione = z.infer<typeof StatoEdizione>;
export type Porta = z.infer<typeof Porta>;
