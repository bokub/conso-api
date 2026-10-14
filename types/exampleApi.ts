export type IndexValue = { d: string; v: string | number; iv?: number };
export type IndexSeries = {
  idClasseTemporelle?: string;
  libelleClasseTemporelle?: string;
  codeCadran?: string;
  valeur?: IndexValue[];
};
export type IndexGrandeur = {
  grandeurMetier?: string;
  unite?: string;
  points?: Array<{ d: string; v: string | number }>;
  calendrier?: Array<{
    libelleCalendrier?: string;
    classeTemporelle?: IndexSeries[];
  }>;
  cadranTotalisateur?: {
    codeCadran?: string;
    valeur?: IndexValue[];
  };
};
export type ExampleApiResult = {
  grandeur?: IndexGrandeur[];
  contexte?: Array<{ grandeur?: IndexGrandeur[] }>;
};
