import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { Bench } from 'tinybench';
import { readFixtures } from './fixtures.js';
import { readPackageInfo } from './package-info.js';
import { importNizelDist, readLocalNizelInfo } from './nizel-local.js';

const resultsDir = new URL('../results/', import.meta.url);
const runsDir = new URL('runs/', resultsDir);
const defaultModes = ['pipeline', 'phase', 'inline', 'helper', 'utility'];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    fixtures: [],
    label: process.env.BENCHMARK_LABEL ?? '',
    modes: defaultModes,
    time: 1000,
    warmupTime: 500,
  };

  for (const arg of args) {
    if (arg.startsWith('--fixture=')) {
      options.fixtures = arg.slice('--fixture='.length).split(',').filter(Boolean);
    } else if (arg.startsWith('--mode=')) {
      options.modes = arg.slice('--mode='.length).split(',').filter(Boolean);
    } else if (arg.startsWith('--label=')) {
      options.label = arg.slice('--label='.length);
    } else if (arg.startsWith('--time=')) {
      options.time = Number(arg.slice('--time='.length));
    } else if (arg.startsWith('--warmup=')) {
      options.warmupTime = Number(arg.slice('--warmup='.length));
    } else if (arg.startsWith('--nizel-repo=')) {
      options.nizelRepo = arg.slice('--nizel-repo='.length);
    } else if (arg.startsWith('--nizel-dist=')) {
      options.nizelDist = arg.slice('--nizel-dist='.length);
    } else if (arg.startsWith('--nizel-package-json=')) {
      options.nizelPackageJson = arg.slice('--nizel-package-json='.length);
    }
  }

  return options;
};

const formatNumber = (value, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '';

const slugifyLabel = (label) =>
  label
    ? `-${label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}`
    : '';

const runStamp = (generatedAt) => generatedAt.replace(/[:.]/g, '-');

const createNizelModules = async () => {
  const [
    { useNizel },
    { parseMarkdown, parseInline, stripInlineMarkdown },
    { renderHtml },
    { collect },
    { extractFrontmatter },
    { renderTemplate },
    { resolveOptions },
    utils,
    block,
    code,
    common,
    lines,
    list,
    html,
    table,
    autolink,
  ] = await Promise.all([
    importNizelDist('index.js'),
    importNizelDist('parse.js'),
    importNizelDist('render.js'),
    importNizelDist('collect.js'),
    importNizelDist('frontmatter.js'),
    importNizelDist('template.js'),
    importNizelDist('options.js'),
    importNizelDist('utils.js'),
    importNizelDist('parse/block.js'),
    importNizelDist('parse/code.js'),
    importNizelDist('parse/common.js'),
    importNizelDist('parse/lines.js'),
    importNizelDist('parse/list.js'),
    importNizelDist('parse/html.js'),
    importNizelDist('parse/table.js'),
    importNizelDist('parse/autolink.js'),
  ]);

  const resolvedOptions = resolveOptions();
  const parseOptions = {
    anchors: resolvedOptions.anchors !== false,
    autolinks: resolvedOptions.autolinks,
    blocks: resolvedOptions.blocks ?? {},
    safe: resolvedOptions.safe !== false,
    slugStyle: resolvedOptions.slugStyle,
  };

  return {
    collect,
    extractFrontmatter,
    parseInline,
    parseMarkdown,
    parseOptions,
    renderHtml,
    renderTemplate,
    stripInlineMarkdown,
    useNizel,
    utils,
    block,
    code,
    common,
    lines,
    list,
    html,
    table,
    autolink,
  };
};

const createInlineCase = (markdown) => {
  const lines = markdown
    .split('\n')
    .filter((line) => line.trim() && !line.trim().startsWith('```'))
    .slice(0, 80);
  const source = lines.join(' ').slice(0, 8000);

  return source || 'Inline **strong** and _emphasis_ with [links](https://example.com) and `code`.';
};

const createTemplateCase = (fixture) => [
  '---',
  'title: {{ title | title }}',
  'description: Rendered by {{ author.name }}',
  '---',
  fixture.markdown,
  '',
  'Built with {{ product | upper }} for {{ author.name }}.',
].join('\n');

const templateData = {
  title: 'nizel markdown benchmark',
  product: 'nizel',
  author: {
    name: 'Sil van Diepen',
  },
  meta: {
    title: 'nizel markdown benchmark',
  },
};

const utilityCases = [
  {
    name: 'escapeHtml',
    createTask: ({ utils }) => () => utils.escapeHtml('<section data-x="1">Tom & Jerry</section>'.repeat(80)),
  },
  {
    name: 'slugify',
    createTask: ({ utils }) => () =>
      utils.slugify('A Heading With Symbols, Accents, And Duplicate Words! '.repeat(40)),
  },
  {
    name: 'textFromUnknown',
    createTask: ({ utils }) => () => utils.textFromUnknown({ nested: ['value', 12, true] }),
  },
  {
    name: 'getPath',
    createTask: ({ utils }) => () => utils.getPath(templateData, 'author.name'),
  },
  {
    name: 'uniqueSlug',
    createTask: ({ utils }) => () => {
      const seen = new Map();
      utils.uniqueSlug('section', seen);
      utils.uniqueSlug('section', seen);
      return utils.uniqueSlug('section', seen);
    },
  },
];

const helperCases = [
  {
    name: 'block.isThematicBreak',
    run: ({ block }) => block.isThematicBreak('  * * * * *  '),
  },
  {
    name: 'block.isSetextUnderline',
    run: ({ block }) => block.isSetextUnderline('---'),
  },
  {
    name: 'block.trimClosingHeadingHashes',
    run: ({ block }) => block.trimClosingHeadingHashes('Heading ###  '),
  },
  {
    name: 'block.normalizeParagraphLine',
    run: ({ block }) => block.normalizeParagraphLine('   paragraph line  '),
  },
  {
    name: 'block.normalizeParagraphSource',
    run: ({ block }) => block.normalizeParagraphSource(['first line  ', 'second line  ']),
  },
  {
    name: 'block.isRawHtmlBlockLine',
    run: ({ block }) => block.isRawHtmlBlockLine('<section data-id="x">content</section>'),
  },
  {
    name: 'code.openingFenceClosePattern',
    run: ({ code }) => code.openingFenceClosePattern('```js filename="app.js"'),
  },
  {
    name: 'code.normalizeCodeSpan',
    run: ({ code }) => code.normalizeCodeSpan(' code\nspan '),
  },
  {
    name: 'code.parseFenceInfo',
    run: ({ code }) => code.parseFenceInfo('js filename="app.js" {1,3-5}', '`'),
  },
  {
    name: 'code.stripFenceIndent',
    run: ({ code }) => code.stripFenceIndent('   const value = 1;', 3),
  },
  {
    name: 'code.parseCodeMeta',
    run: ({ code }) => code.parseCodeMeta('filename="app.js" {1,3-5,9}'),
  },
  {
    name: 'code.expandLineRanges',
    run: ({ code }) => code.expandLineRanges('1,3-5,9,20-25'),
  },
  {
    name: 'common.normalizeReference',
    run: ({ common }) => common.normalizeReference('  My   Reference ẞ '),
  },
  {
    name: 'common.normalizeReferenceLabelForLookup',
    run: ({ common }) => common.normalizeReferenceLabelForLookup(String.raw` My \[Reference\] `),
  },
  {
    name: 'common.stripDestinationBrackets',
    run: ({ common }) => common.stripDestinationBrackets('<https://example.com/a b>'),
  },
  {
    name: 'common.normalizeHref',
    run: ({ common }) => common.normalizeHref('https://example.com/a path?q=one%20two'),
  },
  {
    name: 'common.decodeStringContent',
    run: ({ common }) => common.decodeStringContent(String.raw`Tom \&amp; Jerry &copy; &#169;`),
  },
  {
    name: 'common.decodeEntity',
    run: ({ common }) => common.decodeEntity('ClockwiseContourIntegral'),
  },
  {
    name: 'common.decodeCodePoint',
    run: ({ common }) => common.decodeCodePoint('#x1F600', 0x1f600),
  },
  {
    name: 'lines.expandLeadingTabs',
    run: ({ lines }) => lines.expandLeadingTabs('\titem\n  \tchild\nparagraph'),
  },
  {
    name: 'lines.expandLeadingTabsFromColumn',
    run: ({ lines }) => lines.expandLeadingTabsFromColumn('\tchild content', 2),
  },
  {
    name: 'lines.nextNonBlankLine',
    run: ({ lines }) => lines.nextNonBlankLine(['', '   ', '\t', 'content'], 0),
  },
  {
    name: 'lines.countLeadingSpaces',
    run: ({ lines }) => lines.countLeadingSpaces('      content'),
  },
  {
    name: 'lines.stripLeadingSpaces',
    run: ({ lines }) => lines.stripLeadingSpaces('      content', 4),
  },
  {
    name: 'lines.trimTrailingBlankLines',
    run: ({ lines }) => lines.trimTrailingBlankLines(['code', '  ', '', '']),
  },
  {
    name: 'list.parseListMarker',
    run: ({ list }) => list.parseListMarker('  12. list item'),
  },
  {
    name: 'list.listMarkerBody',
    run: ({ list }) => list.listMarkerBody('     ', 'body'),
  },
  {
    name: 'list.expandListMarkerTabs',
    run: ({ list }) => list.expandListMarkerTabs('1.\tchild'),
  },
  {
    name: 'list.isSameListMarker',
    run: ({ list }) => list.isSameListMarker({ ordered: true, marker: '.' }, { marker: '.' }),
  },
  {
    name: 'list.isParagraphInterruptingListMarker',
    run: ({ list }) => list.isParagraphInterruptingListMarker('1. item'),
  },
  {
    name: 'list.listContentIndent',
    run: ({ list }) => list.listContentIndent(2, 3, 1),
  },
  {
    name: 'html.readHtmlBlock',
    run: ({ html }) => html.readHtmlBlock(['<script>', 'const x = 1;', '</script>', ''], 0),
  },
  {
    name: 'html.isInterruptingHtmlBlockStart',
    run: ({ html }) => html.isInterruptingHtmlBlockStart('<div>'),
  },
  {
    name: 'html.isValidInlineHtmlToken',
    run: ({ html }) => html.isValidInlineHtmlToken('<span data-x="1">'),
  },
  {
    name: 'html.htmlBlockClosingPattern',
    run: ({ html }) => html.htmlBlockClosingPattern('<script>'),
  },
  {
    name: 'html.readHtmlBlockUntil',
    run: ({ html }) => html.readHtmlBlockUntil(['<!--', 'comment', '-->'], 0, /-->/),
  },
  {
    name: 'html.isBlankTerminatedHtmlBlockStart',
    run: ({ html }) => html.isBlankTerminatedHtmlBlockStart('<section>'),
  },
  {
    name: 'html.isValidInlineHtmlTag',
    run: ({ html }) => html.isValidInlineHtmlTag('<span data-x="1">'),
  },
  {
    name: 'html.isBlockTagHtmlBlockStart',
    run: ({ html }) => html.isBlockTagHtmlBlockStart('<section>'),
  },
  {
    name: 'html.readHtmlBlockUntilBlank',
    run: ({ html }) => html.readHtmlBlockUntilBlank(['<section>', 'body', '</section>', ''], 0),
  },
  {
    name: 'table.isTableStart',
    run: ({ table }) => table.isTableStart(['| A | B |', '| --- | :---: |'], 0),
  },
  {
    name: 'table.splitTableRow',
    run: ({ table }) => table.splitTableRow('| A | B | C |'),
  },
  {
    name: 'table.readTable',
    run: ({ table, parseInline, parseOptions }) =>
      table.readTable(['| A | B |', '| --- | :---: |', '| **x** | y |'], 0, parseOptions, parseInline),
  },
  {
    name: 'autolink.trimTrailingPunctuation',
    run: ({ autolink }) => autolink.trimTrailingPunctuation('https://example.com/path...),'),
  },
  {
    name: 'autolink.getAutolinkOptions',
    run: ({ autolink }) => autolink.getAutolinkOptions({ enabled: true, target: '_blank' }),
  },
  {
    name: 'autolink.isExternalHref',
    run: ({ autolink }) => autolink.isExternalHref('https://example.com'),
  },
];

const createFixtureTasks = ({ fixture, modules }) => {
  const processor = modules.useNizel();
  const minimalProcessor = modules.useNizel.preset('minimal');
  const ast = modules.parseMarkdown(fixture.markdown, modules.parseOptions);
  const inlineCase = createInlineCase(fixture.markdown);
  const templateCase = createTemplateCase(fixture);

  return [
    {
      category: 'pipeline',
      fixture: fixture.name,
      functionName: 'useNizel().html',
      run: () => processor.html(fixture.markdown),
    },
    {
      category: 'pipeline',
      fixture: fixture.name,
      functionName: 'useNizel().parse',
      run: () => processor.parse(fixture.markdown),
    },
    {
      category: 'pipeline',
      fixture: fixture.name,
      functionName: 'useNizel().text',
      run: () => processor.text(fixture.markdown),
    },
    {
      category: 'pipeline',
      fixture: fixture.name,
      functionName: 'useNizel().ast',
      run: () => processor.ast(fixture.markdown),
    },
    {
      category: 'pipeline',
      fixture: fixture.name,
      functionName: 'useNizel().meta',
      run: () => processor.meta(templateCase),
    },
    {
      category: 'pipeline',
      fixture: fixture.name,
      functionName: 'useNizel.preset("minimal").html',
      run: () => minimalProcessor.html(fixture.markdown),
    },
    {
      category: 'phase',
      fixture: fixture.name,
      functionName: 'parseMarkdown',
      run: () => modules.parseMarkdown(fixture.markdown, modules.parseOptions),
    },
    {
      category: 'phase',
      fixture: fixture.name,
      functionName: 'renderHtml',
      run: () => modules.renderHtml(ast, {}, {}, {}),
    },
    {
      category: 'phase',
      fixture: fixture.name,
      functionName: 'collect',
      run: () => modules.collect(ast),
    },
    {
      category: 'phase',
      fixture: fixture.name,
      functionName: 'extractFrontmatter',
      run: () => modules.extractFrontmatter(templateCase),
    },
    {
      category: 'phase',
      fixture: fixture.name,
      functionName: 'renderTemplate',
      run: () => modules.renderTemplate(templateCase, templateData, {}),
    },
    {
      category: 'inline',
      fixture: fixture.name,
      functionName: 'parseInline',
      run: () => modules.parseInline(inlineCase, modules.parseOptions),
    },
    {
      category: 'inline',
      fixture: fixture.name,
      functionName: 'stripInlineMarkdown',
      run: () => modules.stripInlineMarkdown(inlineCase, modules.parseOptions),
    },
  ];
};

const createUtilityTasks = (modules) =>
  utilityCases.map((utilityCase) => ({
    category: 'utility',
    fixture: 'synthetic',
    functionName: utilityCase.name,
    run: utilityCase.createTask(modules),
  }));

const createHelperTasks = (modules) =>
  helperCases.map((helperCase) => ({
    category: 'helper',
    fixture: 'synthetic',
    functionName: helperCase.name,
    run: () => helperCase.run(modules),
  }));

const benchmarkTasks = async ({ tasks, time, warmupTime }) => {
  const rows = [];

  for (const taskDefinition of tasks) {
    const bench = new Bench({ time, warmupTime });
    bench.add(taskDefinition.functionName, taskDefinition.run);
    await bench.run();

    const task = bench.tasks[0];
    rows.push({
      category: taskDefinition.category,
      fixture: taskDefinition.fixture,
      function: taskDefinition.functionName,
      hz: task.result?.hz,
      meanMs: task.result?.mean,
      samples: task.result?.samples?.length,
      rme: task.result?.rme,
      error: task.result?.error ? String(task.result.error?.message ?? task.result.error) : undefined,
    });
  }

  return rows;
};

const rankByCost = (rows) =>
  [...rows]
    .sort((a, b) => (b.meanMs ?? 0) - (a.meanMs ?? 0) || a.function.localeCompare(b.function))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

const summarizeCategories = (rows) =>
  [...rows.reduce((categories, row) => {
    const existing = categories.get(row.category) ?? {
      category: row.category,
      totalMeanMs: 0,
      functions: 0,
      slowestFunction: row.function,
      slowestFixture: row.fixture,
      slowestMeanMs: 0,
    };
    const meanMs = row.meanMs ?? 0;

    existing.totalMeanMs += meanMs;
    existing.functions += 1;
    if (meanMs > existing.slowestMeanMs) {
      existing.slowestFunction = row.function;
      existing.slowestFixture = row.fixture;
      existing.slowestMeanMs = meanMs;
    }

    categories.set(row.category, existing);
    return categories;
  }, new Map()).values()]
    .map((category) => ({
      ...category,
      averageMeanMs: category.functions > 0 ? category.totalMeanMs / category.functions : 0,
    }))
    .sort((a, b) => b.totalMeanMs - a.totalMeanMs || a.category.localeCompare(b.category));

const printCostTable = (rows, limit = 20) => {
  console.log('\nSlowest Nizel functions');
  console.log('Lower mean ms is better. This table ranks benchmarked functions by per-call cost.\n');
  console.table(
    rankByCost(rows)
      .slice(0, limit)
      .map((row) => ({
        rank: row.rank,
        category: row.category,
        fixture: row.fixture,
        function: row.function,
        'mean ms': formatNumber(row.meanMs, 4),
        hz: formatNumber(row.hz),
        samples: row.samples,
        rme: formatNumber(row.rme, 2),
        error: row.error ?? '',
      })),
  );
};

const printCategoryTable = (rows) => {
  console.log('\nCost by category');
  console.table(
    summarizeCategories(rows).map((row) => ({
      category: row.category,
      functions: row.functions,
      'total mean ms': formatNumber(row.totalMeanMs, 4),
      'avg mean ms': formatNumber(row.averageMeanMs, 4),
      slowest: row.slowestFunction,
      fixture: row.slowestFixture,
      'slowest ms': formatNumber(row.slowestMeanMs, 4),
    })),
  );
};

const toMarkdownTable = (rows) => {
  const headers = ['Rank', 'Category', 'Fixture', 'Function', 'Mean ms', 'Hz', 'Samples', 'RME', 'Error'];
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];

  for (const row of rankByCost(rows)) {
    lines.push(
      `| ${row.rank} | ${row.category} | ${row.fixture} | ${row.function} | ${formatNumber(row.meanMs, 4)} | ${formatNumber(row.hz)} | ${row.samples ?? ''} | ${formatNumber(row.rme, 2)} | ${row.error ?? ''} |`,
    );
  }

  return lines.join('\n');
};

const toCategoryMarkdownTable = (rows) => {
  const headers = ['Category', 'Functions', 'Total mean ms', 'Average mean ms', 'Slowest function', 'Fixture', 'Slowest ms'];
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];

  for (const row of summarizeCategories(rows)) {
    lines.push(
      `| ${row.category} | ${row.functions} | ${formatNumber(row.totalMeanMs, 4)} | ${formatNumber(row.averageMeanMs, 4)} | ${row.slowestFunction} | ${row.slowestFixture} | ${formatNumber(row.slowestMeanMs, 4)} |`,
    );
  }

  return lines.join('\n');
};

const writeReports = async (report) => {
  await mkdir(resultsDir, { recursive: true });
  await mkdir(runsDir, { recursive: true });

  const enrichedReport = {
    ...report,
    results: rankByCost(report.results),
    summary: {
      categories: summarizeCategories(report.results),
    },
  };
  const runName = `nizel-functions-${runStamp(report.generatedAt)}${slugifyLabel(report.options.label)}`;

  await writeFile(new URL('nizel-functions.latest.json', resultsDir), `${JSON.stringify(enrichedReport, null, 2)}\n`);
  await writeFile(new URL(`${runName}.json`, runsDir), `${JSON.stringify(enrichedReport, null, 2)}\n`);

  const fixtureLines = report.fixtures
    .map((fixture) => `- ${fixture.name}: ${fixture.bytes} bytes, ${fixture.lines} lines`)
    .join('\n');
  const packageLines = Object.entries(report.environment.packages)
    .map(([name, version]) => `- ${name}: ${version}`)
    .join('\n');

  const markdown = [
    '# Nizel Function Benchmark Report',
    '',
    `Generated: ${report.generatedAt}`,
    report.options.label ? `Run label: ${report.options.label}` : '',
    '',
    '## Environment',
    '',
    `- Node: ${report.environment.node}`,
    `- Platform: ${report.environment.platform}`,
    `- Local Nizel: ${report.nizel.name}@${report.nizel.version}`,
    `- Nizel dist: ${report.nizel.dist}`,
    packageLines,
    '',
    '## Fixtures',
    '',
    fixtureLines,
    '',
    '## How To Read The Scores',
    '',
    '- Lower `Mean ms` is better: it means less average time per function call.',
    '- Higher `Hz` is better: it means more calls per second.',
    '- The slowest rows are not automatically bugs, but they identify the first places to inspect.',
    '- `pipeline` measures public processor calls; `phase` measures parser/rendering substeps; `inline` measures inline parsing; `utility` uses synthetic focused cases.',
    '',
    '## Cost By Category',
    '',
    toCategoryMarkdownTable(report.results),
    '',
    '## Slowest Functions',
    '',
    toMarkdownTable(report.results),
    '',
  ].join('\n');

  await writeFile(new URL('nizel-functions.latest.md', resultsDir), markdown);
  await writeFile(new URL(`${runName}.md`, runsDir), markdown);
  await appendFile(
    new URL('index.jsonl', runsDir),
    `${JSON.stringify({
      type: 'nizel-functions',
      generatedAt: report.generatedAt,
      label: report.options.label,
      json: `results/runs/${runName}.json`,
      markdown: `results/runs/${runName}.md`,
      options: report.options,
      summary: enrichedReport.summary,
    })}\n`,
  );
};

const main = async () => {
  const options = parseArgs();
  const fixtures = await readFixtures({ selected: options.fixtures });
  const modules = await createNizelModules();
  const selectedModes = new Set(options.modes);

  if (fixtures.length === 0) {
    throw new Error('No fixtures found. Add .md files to fixtures/ or check --fixture.');
  }

  const tasks = fixtures.flatMap((fixture) =>
    createFixtureTasks({ fixture, modules }).filter((task) => selectedModes.has(task.category)),
  );

  if (selectedModes.has('utility')) {
    tasks.push(...createUtilityTasks(modules));
  }

  if (selectedModes.has('helper')) {
    tasks.push(...createHelperTasks(modules));
  }

  const results = await benchmarkTasks({ tasks, time: options.time, warmupTime: options.warmupTime });

  printCostTable(results);
  printCategoryTable(results);

  const report = {
    generatedAt: new Date().toISOString(),
    environment: await readPackageInfo(),
    nizel: await readLocalNizelInfo(),
    options,
    fixtures: fixtures.map(({ name, file, bytes, lines }) => ({ name, file, bytes, lines })),
    results,
  };

  await writeReports(report);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
