import { appendFile, mkdir, writeFile } from 'node:fs/promises';

const resultsDir = new URL('../results/', import.meta.url);
const runsDir = new URL('runs/', resultsDir);

const formatNumber = (value, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '';

const groupKey = (row) => `${row.fixture}\u0000${row.mode}`;

const compareByHz = (a, b) => (b.hz ?? 0) - (a.hz ?? 0);

const slugifyLabel = (label) =>
  label
    ? `-${label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')}`
    : '';

const runStamp = (generatedAt) => generatedAt.replace(/[:.]/g, '-');

export const rankRows = (rows) => {
  const groups = new Map();

  for (const row of rows) {
    const key = groupKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const ranked = [];

  for (const groupRows of groups.values()) {
    const sorted = [...groupRows].sort(compareByHz);
    const fastest = sorted[0]?.hz ?? 0;

    sorted.forEach((row, index) => {
      const relativeSpeed = fastest > 0 && row.hz ? row.hz / fastest : 0;
      ranked.push({
        ...row,
        rank: index + 1,
        isBest: index === 0,
        relativeSpeed,
        slowerPercent: index === 0 ? 0 : (1 - relativeSpeed) * 100,
      });
    });
  }

  return ranked.sort((a, b) => {
    const fixture = a.fixture.localeCompare(b.fixture);
    if (fixture !== 0) return fixture;
    const mode = a.mode.localeCompare(b.mode);
    if (mode !== 0) return mode;
    return a.rank - b.rank;
  });
};

export const summarizeWinners = (rows) => {
  const wins = new Map();

  for (const row of rows) {
    if (!row.isBest) continue;
    wins.set(row.engine, (wins.get(row.engine) ?? 0) + 1);
  }

  return [...wins.entries()]
    .map(([engine, count]) => ({ engine, wins: count }))
    .sort((a, b) => b.wins - a.wins || a.engine.localeCompare(b.engine));
};

const geometricMean = (values) => {
  const safeValues = values.filter((value) => value > 0);
  if (safeValues.length === 0) return 0;

  const logTotal = safeValues.reduce((total, value) => total + Math.log(value), 0);
  return Math.exp(logTotal / safeValues.length);
};

export const summarizeCategories = (rows) => {
  const modes = new Map();

  for (const row of rows) {
    if (!modes.has(row.mode)) modes.set(row.mode, new Map());
    const engines = modes.get(row.mode);
    const engineRows = engines.get(row.engine) ?? [];
    engineRows.push(row);
    engines.set(row.engine, engineRows);
  }

  const categories = [];

  for (const [mode, engines] of modes.entries()) {
    const rankedEngines = [...engines.entries()]
      .map(([engine, engineRows]) => ({
        mode,
        engine,
        fixtures: engineRows.length,
        wins: engineRows.filter((row) => row.isBest).length,
        score: geometricMean(engineRows.map((row) => row.relativeSpeed)),
        averageRelativeSpeed:
          engineRows.reduce((total, row) => total + row.relativeSpeed, 0) / engineRows.length,
      }))
      .sort((a, b) => b.score - a.score || b.wins - a.wins || a.engine.localeCompare(b.engine));

    rankedEngines.forEach((entry, index) => {
      categories.push({
        ...entry,
        rank: index + 1,
        isBest: index === 0,
        scorePercent: entry.score * 100,
        averageRelativeSpeedPercent: entry.averageRelativeSpeed * 100,
      });
    });
  }

  return categories.sort((a, b) => {
    const mode = a.mode.localeCompare(b.mode);
    if (mode !== 0) return mode;
    return a.rank - b.rank;
  });
};

const toCategoryTable = (rows) => {
  const headers = ['Mode', 'Rank', 'Engine', 'Result', 'Score', 'Average Relative', 'Wins', 'Fixtures'];
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.mode} | ${row.rank} | ${row.engine} | ${row.isBest ? 'best' : ''} | ${formatNumber(row.scorePercent, 1)} | ${formatNumber(row.averageRelativeSpeedPercent, 1)}% | ${row.wins} | ${row.fixtures} |`,
    );
  }

  return lines.join('\n');
};

const toMarkdownTable = (rows) => {
  const headers = ['Fixture', 'Mode', 'Rank', 'Engine', 'Result', 'Hz', 'Mean ms', 'Relative', 'Slower', 'Samples'];
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    const result = row.isBest ? 'best' : '';
    const relative = row.relativeSpeed ? `${formatNumber(row.relativeSpeed * 100, 1)}% of fastest` : '';
    const slower = row.isBest ? '' : `${formatNumber(row.slowerPercent, 1)}%`;

    lines.push(
      `| ${row.fixture} | ${row.mode} | ${row.rank} | ${row.engine} | ${result} | ${formatNumber(row.hz)} | ${formatNumber(row.meanMs, 4)} | ${relative} | ${slower} | ${row.samples ?? ''} |`,
    );
  }

  return lines.join('\n');
};

const toImplementationTable = (rows) => {
  const headers = ['Rank', 'Implementation', 'Result', 'Hz', 'Mean ms', 'Relative', 'Slower', 'Samples'];
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.rank} | ${row.engine} | ${row.isBest ? 'best' : ''} | ${formatNumber(row.hz)} | ${formatNumber(row.meanMs, 4)} | ${row.relativeSpeed ? `${formatNumber(row.relativeSpeed * 100, 1)}% of fastest` : ''} | ${row.isBest ? '' : `${formatNumber(row.slowerPercent, 1)}%`} | ${row.samples ?? ''} |`,
    );
  }

  return lines.join('\n');
};

const describeMode = (mode) => {
  if (mode === 'parse') return 'Markdown string to parser output.';
  if (mode === 'render') return 'Markdown string to HTML string.';
  if (mode === 'cold-import') return 'Module import timing.';
  return mode;
};

const toTestSections = (rows, fixtures) => {
  const fixtureMap = new Map(fixtures.map((fixture) => [fixture.name, fixture]));
  const groups = new Map();

  for (const row of rows) {
    const key = `${row.fixture}\u0000${row.mode}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groupRows]) => {
      const [fixtureName, mode] = key.split('\u0000');
      const fixture = fixtureMap.get(fixtureName);
      const size = fixture ? `${fixture.bytes} bytes, ${fixture.lines} lines` : 'unknown size';

      return [
        `### ${fixtureName} / ${mode}`,
        '',
        `Test: ${describeMode(mode)}`,
        `Fixture: ${fixtureName} (${size}).`,
        '',
        toImplementationTable([...groupRows].sort((a, b) => a.rank - b.rank)),
      ].join('\n');
    })
    .join('\n\n');
};

export const writeReports = async (report) => {
  await mkdir(resultsDir, { recursive: true });
  await mkdir(runsDir, { recursive: true });

  const rankedResults = rankRows(report.results);
  const winnerSummary = summarizeWinners(rankedResults);
  const categoryRankings = summarizeCategories(rankedResults);
  const enrichedReport = {
    ...report,
    results: rankedResults,
    summary: {
      categoryRankings,
      winnerCounts: winnerSummary,
    },
  };

  const json = JSON.stringify(enrichedReport, null, 2);
  const runName = `markdown-${runStamp(report.generatedAt)}${slugifyLabel(report.options.label)}`;
  await writeFile(new URL('latest.json', resultsDir), `${json}\n`);
  await writeFile(new URL(`${runName}.json`, runsDir), `${json}\n`);

  const fixtureLines = report.fixtures
    .map((fixture) => `- ${fixture.name}: ${fixture.bytes} bytes, ${fixture.lines} lines`)
    .join('\n');
  const packageLines = Object.entries(report.environment.packages)
    .map(([name, version]) => `- ${name}: ${version}`)
    .join('\n');
  const winnerLines = winnerSummary.length
    ? winnerSummary.map((entry) => `- ${entry.engine}: ${entry.wins} wins`).join('\n')
    : '- No winners recorded';

  const markdown = [
    '# Markdown Benchmark Report',
    '',
    `Generated: ${report.generatedAt}`,
    report.options.label ? `Run label: ${report.options.label}` : '',
    '',
    '## Environment',
    '',
    `- Node: ${report.environment.node}`,
    `- Platform: ${report.environment.platform}`,
    packageLines,
    '',
    '## Fixtures',
    '',
    fixtureLines,
    '',
    '## How To Read The Scores',
    '',
    '- Higher `Hz` is better: it means more operations per second.',
    '- Lower `Mean ms` is better: it means less average time per operation.',
    '- Rank `1` is the fastest engine for that fixture and mode.',
    '- `Relative` shows each engine as a percentage of the fastest engine in the same fixture and mode.',
    '- `Slower` shows how far behind the fastest engine that result was.',
    '- Category `Score` is the geometric mean of relative speed across fixtures for that mode. Higher is better; `100` means the engine was fastest for every fixture in that mode.',
    '',
    '## Category Rankings',
    '',
    toCategoryTable(categoryRankings),
    '',
    '## Win Counts',
    '',
    winnerLines,
    '',
    '## Benchmark Tests',
    '',
    toTestSections(rankedResults, report.fixtures),
    '',
    '## Flat Results',
    '',
    toMarkdownTable(rankedResults),
    '',
  ].join('\n');

  await writeFile(new URL('latest.md', resultsDir), markdown);
  await writeFile(new URL(`${runName}.md`, runsDir), markdown);
  await appendFile(
    new URL('index.jsonl', runsDir),
    `${JSON.stringify({
      type: 'markdown',
      generatedAt: report.generatedAt,
      label: report.options.label,
      json: `results/runs/${runName}.json`,
      markdown: `results/runs/${runName}.md`,
      options: report.options,
      summary: enrichedReport.summary,
    })}\n`,
  );
};
