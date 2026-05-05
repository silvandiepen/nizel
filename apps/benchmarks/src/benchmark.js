import { Bench } from 'tinybench';
import { createEngines } from './engines/index.js';
import { readFixtures } from './fixtures.js';
import { importNizel, usesLocalNizel } from './nizel-local.js';
import { readPackageInfo } from './package-info.js';
import { rankRows, summarizeCategories, writeReports } from './report.js';

const defaultModes = ['render', 'parse'];

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

const benchmarkMode = async ({ fixture, mode, engines, time, warmupTime }) => {
  const bench = new Bench({ time, warmupTime });

  for (const engine of engines) {
    if (typeof engine[mode] !== 'function') continue;
    bench.add(engine.name, () => engine[mode](fixture.markdown));
  }

  await bench.run();

  return bench.tasks.map((task) => ({
    fixture: fixture.name,
    mode,
    engine: task.name,
    hz: task.result?.hz,
    meanMs: task.result?.mean,
    samples: task.result?.samples?.length,
    rme: task.result?.rme,
  }));
};

const benchmarkColdImport = async ({ fixture, time, warmupTime }) => {
  const imports = [
    ['markdown-it', async () => import('markdown-it')],
    ['marked', async () => import('marked')],
    ['remark', async () => Promise.all([import('unified'), import('remark-parse'), import('remark-gfm'), import('remark-html')])],
    [usesLocalNizel() ? 'nizel-local' : 'nizel', async () => importNizel()],
  ];
  const bench = new Bench({ time, warmupTime });

  for (const [name, load] of imports) {
    bench.add(name, async () => {
      await load();
      return fixture.name;
    });
  }

  await bench.run();

  return bench.tasks.map((task) => ({
    fixture: fixture.name,
    mode: 'cold-import',
    engine: task.name,
    hz: task.result?.hz,
    meanMs: task.result?.mean,
    samples: task.result?.samples?.length,
    rme: task.result?.rme,
  }));
};

const formatNumber = (value, digits = 2) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '';

const printRankedResults = (rows) => {
  console.table(
    rows.map((row) => ({
      fixture: row.fixture,
      mode: row.mode,
      rank: row.rank,
      engine: row.engine,
      result: row.isBest ? 'best' : '',
      hz: formatNumber(row.hz),
      'mean ms': formatNumber(row.meanMs, 4),
      relative: row.relativeSpeed ? `${formatNumber(row.relativeSpeed * 100, 1)}%` : '',
      slower: row.isBest ? '' : `${formatNumber(row.slowerPercent, 1)}%`,
      samples: row.samples,
    })),
  );
};

const printCategoryRankings = (rows) => {
  console.log('\nCategory rankings');
  console.log('Score is geometric mean relative speed across fixtures in the same mode. Higher is better.\n');
  console.table(
    rows.map((row) => ({
      mode: row.mode,
      rank: row.rank,
      engine: row.engine,
      result: row.isBest ? 'best' : '',
      score: formatNumber(row.scorePercent, 1),
      'avg relative': `${formatNumber(row.averageRelativeSpeedPercent, 1)}%`,
      wins: row.wins,
      fixtures: row.fixtures,
    })),
  );
};

const main = async () => {
  const options = parseArgs();
  const fixtures = await readFixtures({ selected: options.fixtures });
  const engines = await createEngines();
  const results = [];

  if (fixtures.length === 0) {
    throw new Error('No fixtures found. Add .md files to fixtures/ or check --fixture.');
  }

  for (const fixture of fixtures) {
    for (const mode of options.modes) {
      const modeResults =
        mode === 'cold-import'
          ? await benchmarkColdImport({ fixture, ...options })
          : await benchmarkMode({ fixture, mode, engines, ...options });

      results.push(...modeResults);
      printRankedResults(rankRows(modeResults));
    }
  }

  printCategoryRankings(summarizeCategories(rankRows(results)));

  const report = {
    generatedAt: new Date().toISOString(),
    environment: await readPackageInfo(),
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
