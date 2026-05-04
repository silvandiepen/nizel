export type ReferenceDefinition = {
  href: string;
  title?: string;
};

/**
 * Normalizes a reference label for case-insensitive lookup.
 */
export const normalizeReference = (label: string): string => {
  return label.trim().replace(/\s+/g, ' ').replace(/[ẞß]/g, 'ss').toLowerCase();
};

/**
 * Normalizes an inline reference label for lookup.
 */
export const normalizeReferenceLabelForLookup = (label: string): string => {
  return normalizeReference(label.replace(/\\([\[\]])/g, '$1'));
};

/**
 * Removes angle brackets from a link reference destination.
 */
export const stripDestinationBrackets = (destination: string): string => {
  return destination.replace(/^<|>$/g, '');
};

/**
 * Applies URI encoding required for rendered link destinations.
 */
export const normalizeHref = (destination: string): string => {
  try {
    return encodeURI(destination).replace(/%25([0-9A-Fa-f]{2})/g, '%$1');
  } catch {
    return destination;
  }
};

/**
 * Decodes backslash escapes and character references in link-like attributes.
 */
export const decodeStringContent = (source: string): string => {
  return source
    .replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g, '$1')
    .replace(/&([A-Za-z][A-Za-z0-9]+|#[0-9]+|#[xX][0-9A-Fa-f]+);/g, (_, entity: string) =>
      decodeEntity(entity),
    );
};

/**
 * Decodes the named and numeric entities Nizel handles directly.
 */
export const decodeEntity = (entity: string): string => {
  if (/^#[xX]/.test(entity)) return decodeCodePoint(entity, Number.parseInt(entity.slice(2), 16));
  if (entity.startsWith('#')) return decodeCodePoint(entity, Number.parseInt(entity.slice(1), 10));
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: '\u00a0',
    AElig: 'Æ',
    auml: 'ä',
    ClockwiseContourIntegral: '∲',
    copy: '©',
    Dcaron: 'Ď',
    DifferentialD: 'ⅆ',
    frac34: '¾',
    HilbertSpace: 'ℋ',
    ngE: '≧̸',
    ouml: 'ö',
  };
  return named[entity] ?? `&${entity};`;
};

/**
 * Converts a numeric entity code point, preserving invalid entities as text.
 */
export const decodeCodePoint = (entity: string, codePoint: number): string => {
  if (
    !Number.isFinite(codePoint) ||
    codePoint === 0 ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff)
  ) {
    return '\ufffd';
  }

  if (codePoint < 0 || codePoint > 0x10ffff) {
    return `&${entity};`;
  }
  return String.fromCodePoint(codePoint);
};
