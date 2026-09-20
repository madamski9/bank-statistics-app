export interface MerchantName {
  /** What to show and group by, e.g. "Latto Gelato". */
  name: string;
  /** "Gdańsk, Pomorskie", when the Wallet push carried one. */
  location?: string;
}

/**
 * Wallet's push names the shop and then, optionally, where it was: "Inmedio  Gdańsk,
 * Pomorskie". The normalizer collapses runs of whitespace before storing, so the two halves
 * arrive separated by a single space and only the comma still marks the city/region boundary.
 *
 * Splitting them matters for more than tidiness: the same shop shows up both ways ("adidas"
 * and "adidas Gdańsk, Pomorskie"), and grouping on the raw line would file one chain under
 * two names — and under as many names as it has branches.
 *
 * The name is matched greedily, so the city takes the shortest match and a shop whose own
 * name ends in a place ("Murall Gdańsk Gdańsk, Pomorskie") keeps it. The cost of that choice
 * is a genuinely two-word city, whose first word stays with the name; it splits that city's
 * branches from the rest of the chain, but never merges two different shops.
 */
const withLocation = /^(.*\S)\s+(\p{L}[\p{L}.'-]*),\s*(\p{Lu}[\p{L}-]+)$/u;

export function splitMerchant(raw: string): MerchantName {
  const collapsed = raw.replace(/\s+/gu, ' ').trim();
  const match = withLocation.exec(collapsed);

  if (match === null) {
    return { name: collapsed };
  }

  return { name: match[1], location: `${match[2]}, ${match[3]}` };
}

/** Case and spacing differ between pushes from the same shop; the key must not. */
export function merchantKey(name: string): string {
  return name.toLocaleLowerCase('pl').replace(/\s+/gu, ' ').trim();
}
