import assert from 'node:assert/strict';
import { tests } from 'commonmark-spec';

const entry = process.env.NIZEL_COMMONMARK_ENTRY ?? '../dist/index.js';
const { useNizel } = await import(entry);

const smokeSections = new Set([
  'ATX headings',
  'Setext headings',
  'Indented code blocks',
  'Fenced code blocks',
  'Thematic breaks',
  'Hard line breaks',
  'Code spans',
  'Backslash escapes',
  'Entity and numeric character references',
  'Link reference definitions',
]);
const smoke = process.env.COMMONMARK_SMOKE === '1';
const reportOnly = process.env.COMMONMARK_REPORT === '1';
const selectedTests = smoke ? tests.filter((example) => smokeSections.has(example.section)) : tests;
const nizel = useNizel({ anchors: false, autolinks: false, frontmatter: false, safe: false });
const failures = [];

for (const example of selectedTests) {
  let html;
  try {
    html = await nizel.html(example.markdown.replaceAll('→', '\t'));
  } catch (error) {
    failures.push({
      number: example.number,
      section: example.section,
      markdown: example.markdown,
      expected: example.html,
      actual: '',
      error: error instanceof Error ? error.stack : String(error),
    });
    continue;
  }

  const expectedHtml = example.html.replaceAll('→', '\t');
  if (normalizeHtml(html) !== normalizeHtml(expectedHtml)) {
    failures.push({
      number: example.number,
      section: example.section,
      markdown: example.markdown,
      expected: expectedHtml,
      actual: html,
    });
  }
}

const bySection = failures.reduce((summary, failure) => {
  summary.set(failure.section, (summary.get(failure.section) ?? 0) + 1);
  return summary;
}, new Map());

console.log(
  JSON.stringify(
    {
      entry,
      mode: smoke ? 'smoke' : 'full',
      total: selectedTests.length,
      passed: selectedTests.length - failures.length,
      failed: failures.length,
      bySection: Object.fromEntries([...bySection.entries()].sort()),
      firstFailures: failures.slice(0, 20),
    },
    null,
    2,
  ),
);

if (!reportOnly) assert.equal(failures.length, 0);

/**
 * Normalizes insignificant trailing whitespace around whole rendered documents.
 */
function normalizeHtml(html) {
  return html.trimEnd();
}
