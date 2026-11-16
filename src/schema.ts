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
    /** Gli importi sono già con l'IVA (`inclusa`, come i workshop) oppure senza
        (`esclusa`, come il Master 1: «750 € + IVA»). Le pagine mostrano sempre il
        prezzo finale, calcolato da `prezzoCorrente` con `ALIQUOTA_IVA`. */
    iva: z.enum(["inclusa", "esclusa"]).default("inclusa"),
  })
  .refine((p) => p.early === undefined || p.early < p.pieno, {
    message: "il prezzo early bird deve essere inferiore al prezzo pieno",
  });

export const Famiglia = z.enum([
  "workshop-intro",
  "workshop-porta",
  "corso",
  "master",
  /** Incontri gratuiti di presentazione della Scuola (16 novembre 2026): si entra
      con l'iscrizione, senza quota. Non stanno nel listino né fra i corsi. */
  "open-day",
]);

/** Ora del giorno, «20:00». */
export const Ora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "deve essere un orario HH:MM");

/** Le due "porte" d'ingresso al percorso: ottenere il meglio da sé o dagli altri. */
export const Porta = z.enum(["se", "altri"]);

export const Formato = z.enum(["presenza", "residenziale", "serale", "online"]);

export const StatoEdizione = z.enum(["bozza", "aperta", "esaurita", "chiusa"]);

/**
 * La sessione individuale compresa nella quota di un corso, con i testi approvati
 * dallo staff. `includeConsulenza` resta il sì/no di listino: le pagine mostrano
 * qualcosa solo quando c'è questo campo.
 */
export const SessioneInclusa = z.object({
  /** Una riga sotto il prezzo, nelle pagine che vendono (elifelab.it): può citare il valore. */
  breve: z.string().min(1),
  /** La riga di andreacirelli.it, che non mostra importi. Senza, lì non compare nulla. */
  breveVetrina: z.string().min(1).optional(),
  /** Il capoverso del riquadro «Cosa comprende la quota». */
  testo: z.string().min(1),
  /** I dettagli come dati. Le pagine mostrano i testi, che li riportano già: questi
      servono alle schede evento e alle campagne. */
  durataMinuti: z.number().int().positive().optional(),
  modalita: z.enum(["online", "presenza"]).optional(),
  /** Entro quanti giorni dalla fine del corso va usata. */
  entroGiorni: z.number().int().positive().optional(),
  /** Valore indicativo in euro. */
  valore: z.number().int().positive().optional(),
});

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
  /** Il titolo che il corso rilascia, da mostrare accanto al suo nome negli elenchi. */
  certificazione: z.string().optional(),
  /** Assente per i master, che a listino non si vendono singolarmente. */
  prezzo: Prezzo.optional(),
  /** Si partecipa senza quota: le edizioni non hanno prezzo e le pagine non ne
      mostrano. Incompatibile con `prezzo`. */
  gratuito: z.boolean().default(false),
  /** Il prezzo si mostra anche se il sito tiene la sua famiglia «su richiesta»
      (Master 1, 16 novembre 2026: 915 € IVA inclusa). */
  esponiPrezzo: z.boolean().default(false),
  includeConsulenza: z.boolean().default(false),
  sessioneInclusa: SessioneInclusa.optional(),
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

/** Una voce del programma di una giornata: «10:00 – 13:00», «Aula». */
export const VoceProgramma = z.object({
  ora: z.string().min(1),
  attivita: z.string().min(1),
  /** Un dubbio sulla voce, mostrato in pagina accanto a lei. */
  daConfermare: z.string().optional(),
});

/** Il programma di un giorno di un'edizione di più giorni (Master 1, 5-7 dicembre 2026). */
export const GiornataProgramma = z.object({
  giorno: DataISO,
  voci: z.array(VoceProgramma).min(1),
});

/** L'occorrenza datata di un corso: è questa che si vende. */
export const Edizione = z
  .object({
    id: Slug,
    corso: Slug,
    dal: DataISO,
    al: DataISO,
    /** Orario d'inizio e di fine, quando è fissato. Senza, le pagine non lo mostrano
        (o usano il testo della landing). */
    orario: z.object({ inizio: Ora, fine: Ora }).optional(),
    /** Obbligatoria, tranne per le edizioni online. */
    sede: Slug.optional(),
    formato: Formato,
    posti: z.number().int().positive(),
    earlyBirdFino: DataISO.optional(),
    /** Override del prezzo di listino del corso, per edizioni fuori standard. */
    prezzo: Prezzo.optional(),
    /** Si pubblica senza quota perché lo staff non l'ha ancora data: le pagine non
        mostrano un prezzo. Senza questo campo un'edizione senza prezzo è un errore. */
    quotaDaConfermare: z.boolean().default(false),
    /** Override dei docenti del corso: i workshop porta li conduce lo staff. */
    docenti: z.array(Slug).optional(),
    stato: StatoEdizione,
    /** Pagina dove ci si iscrive, se non è la scheda del sito: la landing
        dell'evento. Senza, le card portano al calendario. */
    urlIscrizione: z.string().url().optional(),
    note: z.string().optional(),
    /** Il programma giorno per giorno, quando lo staff l'ha dato. */
    programma: z.array(GiornataProgramma).optional(),
    daConfermare: z.array(z.string()).default([]),
  })
  .refine((e) => e.al >= e.dal, {
    message: "la data di fine non può precedere quella di inizio",
  })
  .refine((e) => e.sede !== undefined || e.formato === "online", {
    message: "serve una sede, tranne per le edizioni online",
    path: ["sede"],
  })
  .refine((e) => !e.orario || e.orario.fine > e.orario.inizio, {
    message: "l'orario di fine deve seguire quello d'inizio",
    path: ["orario"],
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
  /**
   * L'anno formativo in corso, quando la scuola l'ha fissato. I workshop che
   * lo precedono sono ingressi: si possono fare prima, ma il percorso parte da
   * `inizio`, cioè dal primo weekend formativo.
   */
  annoFormativo: z
    .object({
      nome: z.string().regex(/^\d{4}\/\d{4}$/, "deve essere nella forma 2026/2027"),
      inizio: DataISO,
    })
    .optional(),
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
  /** Facoltativi finché la sede non è fissata: le pagine mostrano allora la sola città. */
  nome: z.string().min(1).optional(),
  indirizzo: z.string().min(1).optional(),
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
  /** «Dott.»: le pagine lo mettono davanti al nome, che resta senza titolo. */
  titolo: z.string().min(1).optional(),
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
export type SessioneInclusa = z.infer<typeof SessioneInclusa>;
export type Famiglia = z.infer<typeof Famiglia>;
export type Formato = z.infer<typeof Formato>;
export type StatoEdizione = z.infer<typeof StatoEdizione>;
export type GiornataProgramma = z.infer<typeof GiornataProgramma>;
export type Porta = z.infer<typeof Porta>;
