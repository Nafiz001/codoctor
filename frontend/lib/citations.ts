// Maps a citation's source string to the authoritative public document, so the
// source · ref chips become clickable provenance. URLs verified against the
// official sites (WHO publications portal, DGHS, BNF) — June 2026.

const SOURCE_LINKS: { match: RegExp; url: string }[] = [
  // WHO IMCI chart booklet (the danger-sign decision tree)
  { match: /imci|who/i, url: "https://www.who.int/publications/i/item/9789241506823" },
  // DGHS Standard Treatment Guidelines (Bangladesh)
  { match: /dghs/i, url: "https://old.dghs.gov.bd/index.php/en/publications/guideline" },
  // National Drug Formulary / BNF (drug contraindications & interactions)
  { match: /bnf|formulary|ndf/i, url: "https://bnf.nice.org.uk/" },
];

/** Return the authoritative URL for a citation source, or undefined if unknown. */
export function citationHref(source?: string): string | undefined {
  if (!source) return undefined;
  for (const s of SOURCE_LINKS) {
    if (s.match.test(source)) return s.url;
  }
  return undefined;
}
