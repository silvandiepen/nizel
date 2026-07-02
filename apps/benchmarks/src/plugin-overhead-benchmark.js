import { mkdir, writeFile } from 'node:fs/promises';
import { Bench } from 'tinybench';
import { useNizel } from 'nizel';
import { abbrPlugin } from 'nizel-plugin-abbr';
import { alertPlugin } from 'nizel-plugin-alert';
import { autolinkPlugin } from 'nizel-plugin-autolink';
import { citationsPlugin } from 'nizel-plugin-citations';
import { codeCopyPlugin } from 'nizel-plugin-code-copy';
import { deflistPlugin } from 'nizel-plugin-deflist';
import { detailsPlugin } from 'nizel-plugin-details';
import { diagramsPlugin } from 'nizel-plugin-diagrams';
import { emojiPlugin } from 'nizel-plugin-emoji';
import { footnotesPlugin } from 'nizel-plugin-footnotes';
import { frontmatterUiPlugin } from 'nizel-plugin-frontmatter-ui';
import { gfmPlugins } from 'nizel-plugin-gfm';
import { headingAnchorsPlugin } from 'nizel-plugin-heading-anchors';
import { mathPlugin } from 'nizel-plugin-math';
import { mediaPlugin } from 'nizel-plugin-media';
import { sanitizePlugin } from 'nizel-plugin-sanitize';
import { shikiPlugin } from 'nizel-plugin-shiki';
import { tocPlugin } from 'nizel-plugin-toc';
import { typographyPlugin } from 'nizel-plugin-typography';
import { createPlugins, supportedPlugins } from 'nizel-kit';

const resultsDir = new URL('../results/', import.meta.url);

const parseArgs = () => {
  const options = {
    time: 100,
    warmupTime: 25,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--time=')) options.time = Number(arg.slice('--time='.length));
    if (arg.startsWith('--warmup=')) options.warmupTime = Number(arg.slice('--warmup='.length));
  }

  return options;
};

const cases = [
  ['abbr', abbrPlugin(), '*[HTML]: HyperText Markup Language\n\nHTML appears in HTML documents.'],
  ['alert', alertPlugin(), '> [!NOTE]\n> Useful information.'],
  ['autolink', autolinkPlugin(), 'Visit https://example.com and mail hello@example.com.'],
  ['citations', citationsPlugin(), 'See [@doe].\n\n[@doe]: Doe, Example.'],
  ['code-copy', codeCopyPlugin(), '```js\nconst value = 1;\n```'],
  ['deflist', deflistPlugin(), 'Term\n: Definition\n\nOther\n: More'],
  ['details', detailsPlugin(), ':::details More\nHidden **text**.\n:::'],
  ['diagrams', diagramsPlugin(), '```mermaid\nflowchart TD\nA --> B\n```'],
  ['emoji', emojiPlugin(), 'Ship it :rocket: :check: :warning:.'],
  ['footnotes', footnotesPlugin(), 'Text.[^a]\n\n[^a]: Footnote text.'],
  ['frontmatter-ui', frontmatterUiPlugin(), '::frontmatter\ntitle: Doc\ntags: demo\n::'],
  ['gfm', gfmPlugins(), '> [!NOTE]\n> Hi\n\nhttps://example.com'],
  ['heading-anchors', headingAnchorsPlugin(), '# Title\n\n## Section\n\n### Deep'],
  ['math', mathPlugin(), 'Inline $E=mc^2$.\n\n$$\nf(x)=x^2\n$$'],
  ['media', mediaPlugin(), '![Alt text](image.png)'],
  ['sanitize', sanitizePlugin({ allowRawHtml: true }), '<img src=x onerror=alert(1)>\n\n<a href="javascript:alert(1)">x</a>', { safe: false }],
  ['shiki', shikiPlugin(), '```js\nconst value = 1;\n```'],
  ['toc', tocPlugin(), '[[toc]]\n\n# Title\n\n## Section\n\n### Deep'],
  ['typography', typographyPlugin(), '==marked== H~2~O x^2^'],
  [
    'kit-default',
    createPlugins(),
    'Visit https://example.com.\n\n<img src=x onerror=alert(1)>',
    { safe: false },
  ],
  [
    'kit-all',
    createPlugins(supportedPlugins.map((plugin) => plugin.id)),
    [
      '---',
      'title: Full Kit',
      '---',
      '[[toc]]',
      '',
      '# Title',
      '',
      '## Section',
      '',
      '> [!NOTE]',
      '> Hi :rocket:',
      '',
      '*[HTML]: HyperText Markup Language',
      '',
      'HTML, ==mark==, H~2~O, $E=mc^2$, [@doe], and a footnote.[^a]',
      '',
      'Term',
      ': Definition',
      '',
      ':::details More',
      'Hidden text.',
      ':::',
      '',
      '![Alt](image.png)',
      '',
      '```js',
      'const value = 1;',
      '```',
      '',
      '[@doe]: Doe, Example.',
      '[^a]: Footnote text.',
    ].join('\n'),
    { safe: false },
  ],
];

const formatNumber = (value, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '';

const main = async () => {
  const options = parseArgs();
  const rows = [];

  for (const [id, pluginOrPlugins, markdown, processorOptions = {}] of cases) {
    const plugins = Array.isArray(pluginOrPlugins) ? pluginOrPlugins : [pluginOrPlugins];
    const core = useNizel(processorOptions);
    const withPlugin = useNizel({ ...processorOptions, plugins });
    const bench = new Bench({ time: options.time, warmupTime: options.warmupTime });

    bench.add('core', async () => core.html(markdown));
    bench.add(id, async () => withPlugin.html(markdown));
    await bench.run();

    const coreResult = bench.tasks.find((task) => task.name === 'core')?.result;
    const pluginResult = bench.tasks.find((task) => task.name === id)?.result;
    const coreHz = coreResult?.hz ?? 0;
    const pluginHz = pluginResult?.hz ?? 0;
    const relative = coreHz > 0 ? pluginHz / coreHz : 0;

    rows.push({
      plugin: id,
      coreHz,
      pluginHz,
      relative,
      overheadPercent: (1 - relative) * 100,
      coreMeanMs: coreResult?.mean,
      pluginMeanMs: pluginResult?.mean,
      samples: pluginResult?.samples?.length,
    });
  }

  console.table(rows.map((row) => ({
    plugin: row.plugin,
    'core hz': formatNumber(row.coreHz),
    'plugin hz': formatNumber(row.pluginHz),
    relative: `${formatNumber(row.relative * 100, 1)}%`,
    overhead: `${formatNumber(row.overheadPercent, 1)}%`,
    'core mean ms': formatNumber(row.coreMeanMs, 4),
    'plugin mean ms': formatNumber(row.pluginMeanMs, 4),
    samples: row.samples,
  })));

  await mkdir(resultsDir, { recursive: true });
  await writeFile(new URL('plugin-overhead-latest.json', resultsDir), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    options,
    rows,
  }, null, 2)}\n`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
