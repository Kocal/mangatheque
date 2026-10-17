export const AUDIENCES = ["Shōnen", "Seinen", "Shōjo", "Josei", "Kodomo"] as const;

export type Audience = (typeof AUDIENCES)[number];

export interface Volume {
  id: string;
  number: number;
  isbn: string | null;
  asin: string | null;
  imageUrl: string | null;
}

export interface Edition {
  id: string;
  title: string | null;
  volumes: Volume[];
}

export interface Series {
  id: string;
  title: string;
  audience: Audience | null;
  editions: Edition[];
}

export interface Collection {
  user: string;
  fetchedAt: string;
  series: Series[];
}

export interface Dimensions {
  width: number;
  thickness: number;
  height: number;
}

export type DimensionsCache = Record<string, Dimensions>;

export interface Measure extends Partial<Dimensions> {
  series: string;
  edition?: string | null;
}

export type Correction =
  | { remove: string; volumes?: number[] }
  | { add: string; audience: Audience | null; volumes: number[] };

export interface Universe {
  name: string;
  series: string[];
}

export interface Book {
  id: string;
  seriesTitle: string;
  editionTitle: string | null;
  number: number;
  dims: Dimensions;
  estimated: boolean;
  cover: string | null;
}

export interface Unit {
  key: string;
  seriesTitle: string;
  group: Audience | null;
  books: Book[];
  thickness: number;
  colorIndex: number;
}
