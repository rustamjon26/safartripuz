/**
 * Deterministic Uzbek-aware slug. Must stay stable across runs —
 * unstable slugs break Site upsert idempotency.
 */

const CYRILLIC_MAP: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
};

/** Apostrophe / modifier letters common in Uzbek Latin orthography. */
const APOSTROPHE_RE = /['\u2018\u2019\u02BB\u02BC\u201B\u0060\u00B4\u02B9\uA78C]/g;

function transliterateCyrillic(input: string): string {
  let out = "";
  for (const ch of input) {
    const lower = ch.toLowerCase();
    const mapped = CYRILLIC_MAP[lower];
    if (mapped !== undefined) {
      out += mapped;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Normalize o'/g' digraphs (any supported apostrophe) to o/g, then slugify.
 */
export function slugify(input: string): string {
  const nfkc = input.normalize("NFKC").trim().toLowerCase();
  const latinized = transliterateCyrillic(nfkc);
  const collapsedOg = latinized
    .replace(/o['\u2018\u2019\u02BB\u02BC\u201B\u0060\u00B4\u02B9\uA78C]/gi, "o")
    .replace(/g['\u2018\u2019\u02BB\u02BC\u201B\u0060\u00B4\u02B9\uA78C]/gi, "g")
    .replace(APOSTROPHE_RE, "");

  return collapsedOg
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
