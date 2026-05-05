# Markdown Benchmarks

Workspace benchmarks for comparing `markdown-it`, `marked`, `remark`, and `nizel`.

This app lives inside the Nizel repository so contributors can run the same benchmark suite with npm. It uses the built local Nizel dist by default and still allows another Nizel worktree or branch to be selected explicitly.

## Install

```bash
npm install
```

## Run

```bash
npm run benchmark
```

The runner writes:

- `results/latest.json`
- `results/latest.md`
- timestamped history files in `results/runs/`
- `results/runs/index.jsonl`

Use a label when recording a baseline or an optimization run:

```bash
npm run benchmark -- --label=baseline-before-parser-work
BENCHMARK_LABEL=after-inline-cache npm run benchmark
```

## Modes

Default modes:

- `render`: Markdown string to HTML string.
- `parse`: Markdown string to each engine's parser output.

Optional mode:

- `cold-import`: module import timing. This is useful as a rough startup signal, not a replacement for a real bundled Worker-size analysis.

Examples:

```bash
npm run benchmark -- --fixture=small,readme
npm run benchmark -- --mode=render
npm run benchmark -- --mode=parse,render --time=2000 --warmup=1000
```

By default the cross-engine benchmark imports `packages/nizel/dist` from this repository. To compare a different local Nizel worktree without reinstalling packages, build that worktree and pass its repo root:

```bash
cd ../nizel-perf-report
npm run build --workspace nizel
cd ../nizel
npm run benchmark -- --nizel-repo=../nizel-perf-report --fixture=small,readme --mode=parse,render
```

You can also use environment variables, which is convenient when several agents are benchmarking different branches:

```bash
NIZEL_REPO=/path/to/nizel-worktree npm run benchmark
NIZEL_DIST=/path/to/nizel-worktree/packages/nizel/dist npm run benchmark
```

When a local worktree is configured, the Nizel engine is reported as `nizel-local` and the report records the dist and package.json paths.

## Nizel Function Benchmarks

The Nizel function benchmark imports the local built Nizel package from `packages/nizel/dist` by default. Build Nizel before running this when testing local changes. The root benchmark scripts do that automatically. For branch-specific work, pass `--nizel-repo`, `--nizel-dist`, `NIZEL_REPO`, or `NIZEL_DIST` so the benchmark uses the dist from the worktree being tested.

```bash
npm run benchmark:nizel
npm run benchmark:nizel -- --fixture=small,readme --label=baseline
npm run benchmark:nizel -- --mode=pipeline,phase,inline --time=2000 --warmup=1000
npm run benchmark:nizel -- --nizel-repo=../nizel-perf-report --fixture=small --mode=pipeline,phase
```

It writes:

- `results/nizel-functions.latest.json`
- `results/nizel-functions.latest.md`
- timestamped history files in `results/runs/`
- `results/runs/index.jsonl`

Function benchmark categories:

- `pipeline`: public Nizel processor calls such as `.html()` and `.parse()`.
- `phase`: major parser/rendering phases such as `parseMarkdown`, `renderHtml`, and `collect`.
- `inline`: inline parsing and inline text extraction.
- `helper`: exported parser helper functions.
- `utility`: exported general utilities with synthetic focused inputs.

To point at a different Nizel build:

```bash
NIZEL_REPO=/path/to/nizel-worktree npm run benchmark:nizel
NIZEL_DIST=/path/to/nizel/packages/nizel/dist npm run benchmark:nizel
npm run benchmark:nizel -- --nizel-repo=/path/to/nizel-worktree
npm run benchmark:nizel -- --nizel-dist=/path/to/nizel-worktree/packages/nizel/dist
```

## CommonMark Fixture

Generate a broad syntax fixture from the official CommonMark examples:

```bash
npm run fixtures:commonmark
```

Then run only that fixture:

```bash
npm run benchmark -- --fixture=commonmark --mode=parse,render
```

## Local Nizel Builds

Prefer `--nizel-repo` or `NIZEL_REPO` for local development. It avoids package reinstall churn and keeps parallel worktrees isolated from each other. Tarball installs are only needed when intentionally testing the published package shape.

For plugin-heavy scenarios, add another engine adapter that imports the relevant local built plugin package explicitly.

## Notes

The benchmark compares configured pipelines, not abstract project quality. Keep reports honest by recording package versions, fixture sizes, enabled plugins, and whether the run measures parse-only or render output.
