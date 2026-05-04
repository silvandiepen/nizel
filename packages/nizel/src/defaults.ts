import {
  camelCase,
  kebabCase,
  PascalCase,
  sentenceCase,
  snakeCase,
  upperSnakeCase,
} from '@sil/case';
import { format as formatDate, getDateObject } from '@sil/format';
import type { NizelOptions, NizelTemplateFilter } from './types.js';
import { textFromUnknown } from './utils.js';

/**
 * Converts a filter value to lowercase text.
 */
const lowerFilter: NizelTemplateFilter = (value) => textFromUnknown(value).toLowerCase();

/**
 * Converts a filter value to uppercase text.
 */
const upperFilter: NizelTemplateFilter = (value) => textFromUnknown(value).toUpperCase();

/**
 * Converts a filter value to title case.
 */
const titleFilter: NizelTemplateFilter = (value) =>
  sentenceCase(textFromUnknown(value)).replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

/**
 * Converts a filter value to kebab case.
 */
const kebabFilter: NizelTemplateFilter = kebabCase;

/**
 * Converts a filter value to camel case.
 */
const camelFilter: NizelTemplateFilter = camelCase;

/**
 * Converts a filter value to PascalCase.
 */
const pascalFilter: NizelTemplateFilter = PascalCase;

/**
 * Converts a filter value to snake_case.
 */
const snakeFilter: NizelTemplateFilter = snakeCase;

/**
 * Converts a filter value to UPPER_SNAKE_CASE.
 */
const constantFilter: NizelTemplateFilter = upperSnakeCase;

/**
 * Capitalizes the first character of a filter value.
 */
const capitalFilter: NizelTemplateFilter = (value) => {
  const text = textFromUnknown(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Converts a filter value to dot.case notation.
 */
const dotFilter: NizelTemplateFilter = (value) => 
  textFromUnknown(value).toLowerCase().replace(/[\s_-]+/g, '.').replace(/^\.+|\.+$/g, '');

/**
 * Converts a filter value to Header-Case notation.
 */
const headerFilter: NizelTemplateFilter = (value) =>
  textFromUnknown(value).replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Converts a filter value to path/case notation.
 */
const pathFilter: NizelTemplateFilter = (value) =>
  textFromUnknown(value).toLowerCase().replace(/[\s_-]+/g, '/').replace(/^\/+|\/+$/g, '');

/**
 * Converts a filter value to sentence case.
 */
const sentenceFilter: NizelTemplateFilter = (value) =>
  sentenceCase(textFromUnknown(value));

/**
 * Formats values for common content use cases such as currency and dates.
 */
const formatFilter: NizelTemplateFilter = (value, kind, localeOrCurrency = 'en-US') => {
  if (kind === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: textFromUnknown(localeOrCurrency),
    }).format(Number(value));
  }

  if (kind === 'number') {
    const pattern = textFromUnknown(localeOrCurrency);
    return formatNumber(Number(value), pattern);
  }

  if (kind === 'date') {
    const date = new Date(textFromUnknown(value));
    const template = textFromUnknown(localeOrCurrency);
    const dateObject = getDateObject(date);
    return formatDate(date, {
      template: normalizeDateTemplate(template === 'en-US' ? 'YY-MM-DD' : template),
      replace: {
        '§§§': String(dateObject.month_name),
      },
    });
  }

  return textFromUnknown(value);
};

/**
 * Formats a number using a pattern string to determine decimal places.
 */
const formatNumber = (value: number, pattern: string): string => {
  const digits = (pattern.match(/0/g) || []).length;
  const [intPart, decPart] = pattern.split('.');
  const decimals = decPart ? decPart.length : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Converts common date template tokens to the token names used by `@sil/format`.
 */
const normalizeDateTemplate = (template: string): string => {
  return template
    .replaceAll('yyyy', 'YY')
    .replaceAll('MMM', '§§§')
    .replaceAll('dd', 'DD');
};

/**
 * Built-in template filters available to every Nizel processor.
 */
export const defaultFilters: Record<string, NizelTemplateFilter> = {
  lower: lowerFilter,
  upper: upperFilter,
  title: titleFilter,
  capital: capitalFilter,
  capitalize: capitalFilter,
  kebab: kebabFilter,
  camel: camelFilter,
  pascal: pascalFilter,
  snake: snakeFilter,
  constant: constantFilter,
  dot: dotFilter,
  header: headerFilter,
  path: pathFilter,
  sentence: sentenceFilter,
  format: formatFilter,
};

/**
 * Default processor options used before plugins and caller-provided overrides.
 */
export const defaultOptions: Required<
  Pick<
    NizelOptions,
    'output' | 'frontmatter' | 'toc' | 'anchors' | 'safe' | 'unwrapStandaloneImages' | 'elements'
  >
> &
  NizelOptions = {
  output: 'html',
  frontmatter: true,
  template: { missing: 'keep', raw: false, filters: defaultFilters },
  toc: true,
  anchors: true,
  autolinks: { enabled: true },
  safe: true,
  unwrapStandaloneImages: false,
  elements: {},
  blocks: {},
  data: {},
  plugins: [],
  transforms: [],
};
