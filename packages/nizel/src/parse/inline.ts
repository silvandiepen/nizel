import type { NizelAutolinkOptions, NizelInlineNode } from '../types.js';
import { getAutolinkOptions, isExternalHref, trimTrailingPunctuation } from './autolink.js';
import { normalizeCodeSpan } from './code.js';
import {
  decodeEntity,
  decodeStringContent,
  normalizeHref,
  normalizeReference,
  normalizeReferenceLabelForLookup,
  type ReferenceDefinition,
} from './common.js';
import { resolveRemainingEmphasis, type EscapedTextNode } from './emphasis.js';
import { isValidInlineHtmlToken } from './html.js';
import {
  canTailBecomeReferenceLink,
  containsInlineLink,
  findBalancedLabelEnd,
  inlineTitleFromGroups,
  nextInlineLabelOpener,
  normalizeInlineDestination,
  readInlineDestination,
  readInlineReferenceDestination,
  readUnresolvedInlineReferenceEnd,
} from './inline-links.js';
import { stripInlineNodes, trimTrailingSoftBreakSpace } from './inline-text.js';

export type InlineParseOptions = {
  autolinks: boolean | NizelAutolinkOptions | undefined;
  safe?: boolean;
};

export type InlineParseState = {
  references: Map<string, ReferenceDefinition>;
};

/**
 * Parses inline Markdown constructs inside paragraph-like content.
 */
export const parseInline = (
  source: string,
  options: Pick<InlineParseOptions, 'autolinks'> = { autolinks: true },
): NizelInlineNode[] => parseInlineWithState(source, options, { references: new Map() });

/**
 * Parses inline Markdown with reference definition context.
 */
export const parseInlineWithState = (
  source: string,
  options: Pick<InlineParseOptions, 'autolinks'> & Partial<Pick<InlineParseOptions, 'safe'>> = { autolinks: true },
  state: InlineParseState,
  extractNestedLinks = true,
): NizelInlineNode[] => {
  const autolinks = options.autolinks !== false && getAutolinkOptions(options.autolinks).enabled !== false;
  if (!hasInlineSyntax(source, autolinks)) {
    return source ? [{ type: 'text', value: source }] : [];
  }

  if (extractNestedLinks) {
    const scanned = scanBalancedInlineLinks(source, options, state);
    if (scanned) return resolveRemainingEmphasis(scanned);
  }

  const nodes: NizelInlineNode[] = [];
  const safe = options.safe !== false;
  const pattern =
    /(?<inlineHtml><!-->|<!--->|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Z][^>]*>|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z_:][A-Za-z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>)|(?<hardSpaces> {2,}\n)|(?<hardBackslash>\\\n)|(?<softBreak>\n)|(?<!`)(?<codeTicks>`+)(?!`)(?<codeValue>[\s\S]*?)(?<!`)\k<codeTicks>(?!`)|\\(?<escaped>[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])|&(?<entity>[A-Za-z][A-Za-z0-9]+|#[0-9]+|#[xX][0-9A-Fa-f]+);|!\[(?<refImageAlt>[^\]]*)\]\[(?<refImageLabel>[^\]]*)\]|\[(?<refLinkText>[^\]`<\[]+)\]\[(?<refLinkLabel>[^\]]*)\]|!\[(?<inlineImageAlt>[^\]`<]*)\]\([ \t\n]*(?<inlineImageHref><[^<>\n\\]*>|(?!<)(?:\\.|[^() \t\n`\\]|\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\))*)(?:[ \t\n]+(?:"(?<inlineImageTitle>(?:\\.|[^"`])*)"|'(?<inlineImageTitleSingle>[^']*)'|\((?<inlineImageTitleParen>[^)]*)\)))?[ \t\n]*\)|\[(?<inlineLinkText>[^\]`<]*)\]\([ \t\n]*(?<inlineLinkHref><[^<>\n\\]*>|(?!<)(?:\\.|[^() \t\n`\\]|\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\))*)(?:[ \t\n]+(?:"(?<inlineLinkTitle>(?:\\.|[^"`])*)"|'(?<inlineLinkTitleSingle>[^']*)'|\((?<inlineLinkTitleParen>[^)]*)\)))?[ \t\n]*\)|<(?<angleUrl>[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\s]*)>|<(?<angleEmail>[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)*)>|!\[(?<shortcutImageAlt>(?:\\\]|[^\]`<\[])+)\]|\[(?<shortcutLinkText>(?:\\\]|[^\]`<\[])+)\]|~~(?<deleteValue>[^~`]+)~~|(?<bareUrl>https?:\/\/[^\s<`]+)|(?<bareEmail>[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/giu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source))) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', value: source.slice(lastIndex, match.index) });
    }

    const groups = match.groups ?? {};

    if (groups.inlineHtml !== undefined) {
      nodes.push(
        safe || !isValidInlineHtmlToken(groups.inlineHtml)
          ? { type: 'text', value: groups.inlineHtml }
          : { type: 'inlineHtml', value: groups.inlineHtml },
      );
    } else if (groups.hardSpaces !== undefined || groups.hardBackslash !== undefined) {
      nodes.push({ type: 'lineBreak', hard: true });
    } else if (groups.softBreak !== undefined) {
      trimTrailingSoftBreakSpace(nodes);
      nodes.push({ type: 'lineBreak', value: ' ' });
    } else if (groups.codeValue !== undefined) {
      nodes.push({ type: 'inlineCode', code: normalizeCodeSpan(groups.codeValue) });
    } else if (groups.escaped !== undefined) {
      nodes.push({ type: 'text', value: groups.escaped, escaped: true } as EscapedTextNode);
    } else if (groups.entity !== undefined) {
      nodes.push({ type: 'text', value: decodeEntity(groups.entity), escaped: true } as EscapedTextNode);
    } else if (groups.refImageAlt !== undefined) {
      const reference = state.references.get(normalizeReferenceLabelForLookup(groups.refImageLabel || groups.refImageAlt));
      if (reference) {
        nodes.push({
          type: 'image',
          alt: stripInlineMarkdown(groups.refImageAlt, options),
          src: reference.href,
          title: reference.title,
        });
      } else {
        nodes.push({ type: 'text', value: decodeStringContent(match[0]) });
      }
    } else if (groups.refLinkText !== undefined) {
      const reference = state.references.get(normalizeReferenceLabelForLookup(groups.refLinkLabel || groups.refLinkText));
      if (reference) {
        nodes.push({
          type: 'link',
          href: reference.href,
          title: reference.title,
          external: isExternalHref(reference.href),
          children: parseInlineWithState(groups.refLinkText, options, state),
        });
      } else {
        nodes.push({ type: 'text', value: decodeStringContent(match[0]) });
      }
    } else if (groups.inlineImageAlt !== undefined) {
      nodes.push({
        type: 'image',
        alt: stripInlineMarkdown(groups.inlineImageAlt, options),
        src: normalizeHref(decodeStringContent(normalizeInlineDestination(groups.inlineImageHref))),
        title: inlineTitleFromGroups(groups, 'inlineImageTitle'),
      });
    } else if (groups.inlineLinkText !== undefined) {
      const href = normalizeHref(decodeStringContent(normalizeInlineDestination(groups.inlineLinkHref)));
      nodes.push({
        type: 'link',
        href,
        title: inlineTitleFromGroups(groups, 'inlineLinkTitle'),
        external: isExternalHref(href),
        children: parseInlineWithState(groups.inlineLinkText, options, state),
      });
    } else if (groups.angleUrl !== undefined) {
      const href = normalizeHref(groups.angleUrl);
      nodes.push({
        type: 'link',
        href,
        external: isExternalHref(href),
        children: [{ type: 'text', value: groups.angleUrl }],
      });
    } else if (groups.angleEmail !== undefined) {
      nodes.push({
        type: 'link',
        href: `mailto:${groups.angleEmail}`,
        external: false,
        children: [{ type: 'text', value: groups.angleEmail }],
      });
    } else if (groups.shortcutImageAlt !== undefined) {
      const alt = decodeStringContent(groups.shortcutImageAlt);
      const reference = state.references.get(normalizeReference(alt));
      if (reference) {
        nodes.push({
          type: 'image',
          alt: stripInlineMarkdown(alt, options),
          src: reference.href,
          title: reference.title,
        });
      } else {
        nodes.push({ type: 'text', value: decodeStringContent(match[0]) });
      }
    } else if (groups.shortcutLinkText !== undefined) {
      const text = decodeStringContent(groups.shortcutLinkText);
      const reference = state.references.get(normalizeReference(text));
      if (reference) {
        nodes.push({
          type: 'link',
          href: reference.href,
          title: reference.title,
          external: isExternalHref(reference.href),
          children: parseInlineWithState(text, options, state),
        });
      } else {
        nodes.push({ type: 'text', value: decodeStringContent(match[0]) });
      }
    } else if (groups.deleteValue !== undefined) {
      nodes.push({ type: 'delete', children: parseInlineWithState(groups.deleteValue, options, state) });
    } else if (groups.strongStarValue !== undefined || groups.strongUnderscoreValue !== undefined) {
      nodes.push({
        type: 'strong',
        children: parseInlineWithState(groups.strongStarValue ?? groups.strongUnderscoreValue, options, state),
      });
    } else if (groups.emStarValue !== undefined || groups.emUnderscoreValue !== undefined) {
      nodes.push({
        type: 'emphasis',
        children: parseInlineWithState(groups.emStarValue ?? groups.emUnderscoreValue, options, state),
      });
    } else if (groups.bareUrl !== undefined && autolinks) {
      const href = trimTrailingPunctuation(groups.bareUrl);
      nodes.push({
        type: 'link',
        href,
        external: true,
        children: [{ type: 'text', value: href }],
      });
      const trailing = groups.bareUrl.slice(href.length);
      if (trailing) nodes.push({ type: 'text', value: trailing });
    } else if (groups.bareEmail !== undefined && autolinks) {
      nodes.push({
        type: 'link',
        href: `mailto:${groups.bareEmail}`,
        external: false,
        children: [{ type: 'text', value: groups.bareEmail }],
      });
    } else {
      nodes.push({ type: 'text', value: match[0] });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < source.length) nodes.push({ type: 'text', value: source.slice(lastIndex) });
  return resolveRemainingEmphasis(nodes);
};

/**
 * Checks whether inline source can contain Markdown syntax.
 */
const hasInlineSyntax = (source: string, autolinks: boolean): boolean => {
  if (!source) return false;
  if (/[\\`<&\n\[\]*_~]/.test(source)) return true;
  return autolinks && (
    source.includes('http://') ||
    source.includes('https://') ||
    source.includes('@')
  );
};

/**
 * Scans balanced inline link and image labels before regex tokenization.
 */
export const scanBalancedInlineLinks = (
  source: string,
  options: Pick<InlineParseOptions, 'autolinks'> & Partial<Pick<InlineParseOptions, 'safe'>>,
  state: InlineParseState,
): NizelInlineNode[] | null => {
  const nodes: NizelInlineNode[] = [];
  let cursor = 0;
  let searchStart = 0;
  let found = false;

  while (cursor < source.length) {
    const opener = nextInlineLabelOpener(source, searchStart);
    if (opener === -1) break;

    const image = source[opener] === '!';
    const labelStart = opener + (image ? 2 : 1);
    const labelEnd = findBalancedLabelEnd(source, labelStart);
    if (labelEnd === -1) {
      searchStart = opener + 1;
      continue;
    }

    const label = source.slice(labelStart, labelEnd);
    if (!image && containsInlineLink(label)) {
      searchStart = opener + 1;
      continue;
    }

    const inlineDestination = source[labelEnd + 1] === '(' ? readInlineDestination(source, labelEnd + 1) : null;
    const referenceDestination = inlineDestination ? null : readInlineReferenceDestination(source, labelEnd, label, state);
    const href = inlineDestination?.href ?? referenceDestination?.href;
    if (href === undefined) {
      const unresolvedReferenceEnd = inlineDestination ? -1 : readUnresolvedInlineReferenceEnd(source, labelEnd);
      if (!image && unresolvedReferenceEnd !== -1) {
        const referenceLabel = source.slice(labelEnd + 2, unresolvedReferenceEnd);
        if (opener > cursor) {
          nodes.push(...parseInlineWithState(source.slice(cursor, opener), options, state, false));
        }
        nodes.push({ type: 'text', value: '[' });
        nodes.push(...parseInlineWithState(label, options, state, false));
        nodes.push({ type: 'text', value: ']' });
        if (!canTailBecomeReferenceLink(source, unresolvedReferenceEnd, referenceLabel, state)) {
          nodes.push({ type: 'text', value: '[' });
          nodes.push(...parseInlineWithState(referenceLabel, options, state, false));
          nodes.push({ type: 'text', value: ']' });
          cursor = unresolvedReferenceEnd + 1;
        } else {
          cursor = labelEnd + 1;
        }
        found = true;
        searchStart = unresolvedReferenceEnd + 1;
        continue;
      }
      searchStart = opener + 1;
      continue;
    }
    const title = inlineDestination?.title ?? referenceDestination?.title;
    const endIndex = inlineDestination?.endIndex ?? referenceDestination?.endIndex;
    if (endIndex === undefined) {
      searchStart = opener + 1;
      continue;
    }

    if (opener > cursor) {
      nodes.push(...parseInlineWithState(source.slice(cursor, opener), options, state, false));
    }

    if (image) {
      nodes.push({
        type: 'image',
        alt: stripInlineMarkdown(label, options),
        src: normalizeHref(decodeStringContent(href)),
        title: title === undefined ? undefined : decodeStringContent(title),
      });
    } else {
      const normalizedHref = normalizeHref(decodeStringContent(href));
      nodes.push({
        type: 'link',
        href: normalizedHref,
        title: title === undefined ? undefined : decodeStringContent(title),
        external: isExternalHref(normalizedHref),
        children: parseInlineWithState(label, options, state, false),
      });
    }

    found = true;
    cursor = endIndex + 1;
    searchStart = cursor;
  }

  if (!found) return null;
  if (cursor < source.length) {
    nodes.push(...parseInlineWithState(source.slice(cursor), options, state, false));
  }
  return nodes;
};

/**
 * Converts inline Markdown source to its plain text equivalent.
 */
export const stripInlineMarkdown = (
  source: string,
  options: Pick<InlineParseOptions, 'autolinks'> = { autolinks: true },
): string => stripInlineNodes(parseInline(source, options));
