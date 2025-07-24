// server/types/json2csv.d.ts
declare module 'json2csv' {
  export interface ParserOptions<T = any> {
    fields?: string[] | { label: string; value: string }[];
    delimiter?: string;
    eol?: string;
    header?: boolean;
    // ... autres options si besoin
  }
  export class Parser<T = any> {
    constructor(opts?: ParserOptions<T>);
    parse(data: T[]): string;
  }
} 