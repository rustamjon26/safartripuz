/**
 * Normalize Uzbekistan mobile numbers to `+998XXXXXXXXX`.
 * Returns null when the input cannot be interpreted as a valid UZ mobile.
 */
export function normalizeUzPhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Placeholder phones created for Google OAuth users — treat as empty.
  if (/^google_/i.test(raw)) return null;

  const digits = raw.replace(/\D/g, "");
  let national: string | null = null;

  if (digits.length === 9) {
    national = digits;
  } else if (digits.length === 12 && digits.startsWith("998")) {
    national = digits.slice(3);
  } else if (digits.length === 13 && digits.startsWith("998")) {
    // rare paste with extra digit
    national = null;
  }

  if (!national || !/^[0-9]{9}$/.test(national)) return null;
  // Mobile prefixes in UZ commonly 90/91/93/94/95/97/98/99/33/88…
  if (!/^(33|50|55|77|88|90|91|93|94|95|97|98|99)/.test(national)) {
    // Still accept any 9-digit national — carriers change; don't over-block.
  }
  return `+998${national}`;
}

export function isGooglePhonePlaceholder(phone: string | null | undefined): boolean {
  return Boolean(phone && /^google_/i.test(phone.trim()));
}
