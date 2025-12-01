// server/types/json2csv.d.ts
declare module "json2csv" {
  export interface ParserOptions<_T = unknown> {
    fields?: string[] | { label: string; value: string }[];
    delimiter?: string;
    eol?: string;
    header?: boolean;
    // ... autres options si besoin
  }
  export class Parser<T = unknown> {
    constructor(opts?: ParserOptions<T>);
    parse(data: T[]): string;
  }
}
