---
title: Benchmarks
icon: ui/chart
order: 15
---

# Benchmarks

Per-plugin overhead can be measured with:

```bash
npm run benchmark:plugins -- --time=100 --warmup=25
```

This compares core rendering with `core + one plugin` for every official plugin and writes `apps/benchmarks/results/plugin-overhead-latest.json`.

Nizel keeps two benchmark reports: an engine comparison against other Markdown parsers and an internal function benchmark for finding parser, renderer, and pipeline bottlenecks.

The numbers below are from the local benchmark suite using the current Nizel worktree. Higher Hz and higher scores are better. Lower mean milliseconds are better.

<style>
.benchmark-bar {
  display: inline-block;
  width: min(180px, 100%);
  height: 0.7rem;
  overflow: hidden;
  vertical-align: middle;
  background: color-mix(in srgb, currentColor 12%, transparent);
  border-radius: 999px;
}

.benchmark-bar span {
  display: block;
  height: 100%;
  background: currentColor;
}
</style>

## Summary

| Metric | Value |
| --- | --- |
| Benchmark run | 5 May 2026, 12:31 (2026-05-05T10:31:06.691Z) |
| Function run | 5 May 2026, 12:34 (2026-05-05T10:34:02.886Z) |
| Run label | after-render-fast-path |
| Node | v22.12.0 |
| Platform | darwin-arm64 |
| Nizel source | ../nizel |
| Nizel dist | packages/nizel/dist/ |
| Time / warmup | 700ms / 300ms |
| Function time / warmup | 500ms / 200ms |
| markdown-it | 14.1.1 |
| marked | 18.0.3 |
| remark | 11.0.0 |
| tinybench | 4.1.0 |

## Fixtures

- code-heavy: 700 bytes, 46 lines
- gfm: 559 bytes, 23 lines
- large: 2093 bytes, 83 lines
- readme: 997 bytes, 44 lines
- small: 191 bytes, 14 lines

## Engine Rankings

Score is the geometric mean of relative speed across fixtures for the mode. A score of 100 means that engine was fastest for every fixture in that mode.

| Mode | Rank | Engine | Result | Score | Graph | Average Relative | Wins | Fixtures |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| parse | 1 | nizel-local | best | 91.8 | <div class="benchmark-bar" aria-label="91.8"><span style="width: 91.8%"></span></div> | 92.6% | 3 | 5 |
| parse | 2 | markdown-it |  | 87.1 | <div class="benchmark-bar" aria-label="87.1"><span style="width: 87.1%"></span></div> | 87.8% | 2 | 5 |
| parse | 3 | marked |  | 56.1 | <div class="benchmark-bar" aria-label="56.1"><span style="width: 56.1%"></span></div> | 58.0% | 0 | 5 |
| parse | 4 | remark |  | 4.0 | <div class="benchmark-bar" aria-label="4.0"><span style="width: 4.0%"></span></div> | 4.0% | 0 | 5 |
| render | 1 | markdown-it | best | 93.2 | <div class="benchmark-bar" aria-label="93.2"><span style="width: 93.2%"></span></div> | 93.6% | 2 | 5 |
| render | 2 | nizel-local |  | 89.9 | <div class="benchmark-bar" aria-label="89.9"><span style="width: 89.9%"></span></div> | 90.7% | 2 | 5 |
| render | 3 | marked |  | 65.7 | <div class="benchmark-bar" aria-label="65.7"><span style="width: 65.7%"></span></div> | 67.6% | 1 | 5 |
| render | 4 | remark |  | 4.5 | <div class="benchmark-bar" aria-label="4.5"><span style="width: 4.5%"></span></div> | 4.6% | 0 | 5 |

## Fixture Winners

- nizel-local: 5 wins
- markdown-it: 4 wins
- marked: 1 wins

## Benchmark Tests

Each benchmark test is shown first, followed by the result for every implementation in that exact test.

### code-heavy / parse

Test: Markdown string to parser output.
Fixture: code-heavy (700 bytes, 46 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | nizel-local | best | 139,733.69 | 0.0073 | 100.0% of fastest |  | 95,299 |
| 2 | markdown-it |  | 124,013.45 | 0.0083 | 88.7% of fastest | 11.3% | 84,777 |
| 3 | marked |  | 123,466.58 | 0.0082 | 88.4% of fastest | 11.6% | 85,128 |
| 4 | remark |  | 5,204.81 | 0.1960 | 3.7% of fastest | 96.3% | 3,572 |

### code-heavy / render

Test: Markdown string to HTML string.
Fixture: code-heavy (700 bytes, 46 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | marked | best | 92,707.84 | 0.0109 | 100.0% of fastest |  | 63,993 |
| 2 | markdown-it |  | 91,168.95 | 0.0112 | 98.3% of fastest | 1.7% | 62,358 |
| 3 | nizel-local |  | 89,634.40 | 0.0121 | 96.7% of fastest | 3.3% | 57,752 |
| 4 | remark |  | 4,774.63 | 0.2139 | 5.2% of fastest | 94.8% | 3,273 |

### gfm / parse

Test: Markdown string to parser output.
Fixture: gfm (559 bytes, 23 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | nizel-local | best | 52,830.94 | 0.0197 | 100.0% of fastest |  | 35,603 |
| 2 | markdown-it |  | 38,062.06 | 0.0270 | 72.0% of fastest | 28.0% | 25,902 |
| 3 | marked |  | 31,147.46 | 0.0328 | 59.0% of fastest | 41.0% | 21,358 |
| 4 | remark |  | 2,288.02 | 0.4567 | 4.3% of fastest | 95.7% | 1,533 |

### gfm / render

Test: Markdown string to HTML string.
Fixture: gfm (559 bytes, 23 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | nizel-local | best | 41,937.80 | 0.0247 | 100.0% of fastest |  | 28,386 |
| 2 | markdown-it |  | 32,623.46 | 0.0318 | 77.8% of fastest | 22.2% | 22,018 |
| 3 | marked |  | 29,018.39 | 0.0351 | 69.2% of fastest | 30.8% | 19,938 |
| 4 | remark |  | 1,979.71 | 0.5244 | 4.7% of fastest | 95.3% | 1,335 |

### large / parse

Test: Markdown string to parser output.
Fixture: large (2093 bytes, 83 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | markdown-it | best | 17,882.65 | 0.0575 | 100.0% of fastest |  | 12,172 |
| 2 | nizel-local |  | 12,419.42 | 0.0825 | 69.4% of fastest | 30.6% | 8,488 |
| 3 | marked |  | 8,010.82 | 0.1268 | 44.8% of fastest | 55.2% | 5,522 |
| 4 | remark |  | 747.15 | 1.3625 | 4.2% of fastest | 95.8% | 514 |

### large / render

Test: Markdown string to HTML string.
Fixture: large (2093 bytes, 83 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | markdown-it | best | 14,881.50 | 0.0694 | 100.0% of fastest |  | 10,084 |
| 2 | nizel-local |  | 10,220.57 | 0.1010 | 68.7% of fastest | 31.3% | 6,931 |
| 3 | marked |  | 7,543.96 | 0.1349 | 50.7% of fastest | 49.3% | 5,191 |
| 4 | remark |  | 636.17 | 1.6700 | 4.3% of fastest | 95.7% | 420 |

### readme / parse

Test: Markdown string to parser output.
Fixture: readme (997 bytes, 44 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | nizel-local | best | 57,310.52 | 0.0181 | 100.0% of fastest |  | 38,639 |
| 2 | markdown-it |  | 44,880.98 | 0.0240 | 78.3% of fastest | 21.7% | 29,216 |
| 3 | marked |  | 25,211.05 | 0.0413 | 44.0% of fastest | 56.0% | 16,954 |
| 4 | remark |  | 1,873.66 | 0.5426 | 3.3% of fastest | 96.7% | 1,291 |

### readme / render

Test: Markdown string to HTML string.
Fixture: readme (997 bytes, 44 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | nizel-local | best | 41,532.94 | 0.0263 | 100.0% of fastest |  | 26,648 |
| 2 | markdown-it |  | 38,241.54 | 0.0269 | 92.1% of fastest | 7.9% | 26,030 |
| 3 | marked |  | 23,486.82 | 0.0435 | 56.5% of fastest | 43.5% | 16,076 |
| 4 | remark |  | 1,628.18 | 0.6258 | 3.9% of fastest | 96.1% | 1,120 |

### small / parse

Test: Markdown string to parser output.
Fixture: small (191 bytes, 14 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | markdown-it | best | 136,790.82 | 0.0076 | 100.0% of fastest |  | 91,918 |
| 2 | nizel-local |  | 128,187.77 | 0.0081 | 93.7% of fastest | 6.3% | 86,076 |
| 3 | marked |  | 73,956.43 | 0.0147 | 54.1% of fastest | 45.9% | 47,638 |
| 4 | remark |  | 6,062.50 | 0.1711 | 4.4% of fastest | 95.6% | 4,093 |

### small / render

Test: Markdown string to HTML string.
Fixture: small (191 bytes, 14 lines).

| Rank | Implementation | Result | Hz | Mean ms | Relative | Slower | Samples |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | markdown-it | best | 113,782.04 | 0.0093 | 100.0% of fastest |  | 75,126 |
| 2 | nizel-local |  | 100,556.02 | 0.0103 | 88.4% of fastest | 11.6% | 67,963 |
| 3 | marked |  | 70,298.99 | 0.0147 | 61.8% of fastest | 38.2% | 47,754 |
| 4 | remark |  | 5,379.13 | 0.1947 | 4.7% of fastest | 95.3% | 3,596 |

## Nizel Internal Costs

The internal benchmark separates public pipeline calls from parser/rendering phases and inline parsing. These rows are useful for deciding where optimization work should start.

| Category | Functions | Total mean ms | Graph | Average mean ms | Slowest function | Fixture | Slowest ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pipeline | 30 | 0.7704 | <div class="benchmark-bar" aria-label="0.8"><span style="width: 100.0%"></span></div> | 0.0257 | useNizel().html | large | 0.0984 |
| phase | 25 | 0.2014 | <div class="benchmark-bar" aria-label="0.2"><span style="width: 26.1%"></span></div> | 0.0081 | parseMarkdown | large | 0.0877 |
| inline | 10 | 0.1429 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 18.5%"></span></div> | 0.0143 | stripInlineMarkdown | large | 0.0436 |

## Function Results

| Rank | Category | Fixture | Function | Mean ms | Cost | Hz | Samples | RME |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | pipeline | large | useNizel().html | 0.0984 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 100.0%"></span></div> | 10,335.08 | 5,080 | 0.54 |
| 2 | pipeline | large | useNizel().text | 0.0965 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 98.0%"></span></div> | 10,548.08 | 5,184 | 0.53 |
| 3 | pipeline | large | useNizel.preset("minimal").html | 0.0909 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 92.3%"></span></div> | 11,211.83 | 5,503 | 0.56 |
| 4 | phase | large | parseMarkdown | 0.0877 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 89.1%"></span></div> | 11,894.60 | 5,704 | 0.93 |
| 5 | pipeline | large | useNizel().ast | 0.0861 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 87.5%"></span></div> | 11,975.50 | 5,807 | 0.73 |
| 6 | pipeline | large | useNizel().parse | 0.0829 | <div class="benchmark-bar" aria-label="0.1"><span style="width: 84.3%"></span></div> | 12,280.02 | 6,029 | 0.53 |
| 7 | inline | large | stripInlineMarkdown | 0.0436 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 44.3%"></span></div> | 23,495.09 | 11,479 | 0.60 |
| 8 | inline | large | parseInline | 0.0425 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 43.2%"></span></div> | 24,160.19 | 11,763 | 0.62 |
| 9 | pipeline | gfm | useNizel().html | 0.0248 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 25.1%"></span></div> | 41,560.38 | 20,202 | 0.56 |
| 10 | pipeline | readme | useNizel().html | 0.0240 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 24.4%"></span></div> | 43,035.83 | 20,802 | 0.65 |
| 11 | pipeline | readme | useNizel().text | 0.0236 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 24.0%"></span></div> | 44,359.71 | 21,166 | 0.80 |
| 12 | pipeline | gfm | useNizel().text | 0.0232 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 23.6%"></span></div> | 44,366.54 | 21,568 | 0.57 |
| 13 | pipeline | gfm | useNizel().ast | 0.0198 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 20.1%"></span></div> | 51,897.89 | 25,286 | 0.52 |
| 14 | pipeline | gfm | useNizel().parse | 0.0195 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 19.8%"></span></div> | 52,602.45 | 25,641 | 0.51 |
| 15 | pipeline | gfm | useNizel.preset("minimal").html | 0.0194 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 19.7%"></span></div> | 53,092.93 | 25,742 | 0.59 |
| 16 | phase | gfm | parseMarkdown | 0.0193 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 19.6%"></span></div> | 53,079.84 | 25,862 | 0.53 |
| 17 | pipeline | readme | useNizel().ast | 0.0191 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 19.4%"></span></div> | 55,174.65 | 26,164 | 0.85 |
| 18 | phase | readme | parseMarkdown | 0.0179 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 18.2%"></span></div> | 57,800.99 | 27,875 | 0.68 |
| 19 | pipeline | readme | useNizel().parse | 0.0178 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 18.1%"></span></div> | 57,920.73 | 28,096 | 0.59 |
| 20 | pipeline | readme | useNizel.preset("minimal").html | 0.0168 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 17.1%"></span></div> | 63,111.43 | 29,779 | 0.91 |
| 21 | inline | gfm | stripInlineMarkdown | 0.0124 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 12.6%"></span></div> | 82,142.01 | 40,181 | 0.46 |
| 22 | phase | large | renderHtml | 0.0124 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 12.6%"></span></div> | 83,082.93 | 40,255 | 0.53 |
| 23 | inline | gfm | parseInline | 0.0122 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 12.4%"></span></div> | 83,797.94 | 41,121 | 0.40 |
| 24 | phase | large | collect | 0.0119 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 12.1%"></span></div> | 86,553.27 | 41,902 | 0.55 |
| 25 | pipeline | code-heavy | useNizel().html | 0.0116 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 11.7%"></span></div> | 89,780.02 | 43,279 | 0.40 |
| 26 | inline | code-heavy | stripInlineMarkdown | 0.0114 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 11.6%"></span></div> | 89,508.01 | 43,710 | 0.47 |
| 27 | inline | code-heavy | parseInline | 0.0111 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 11.3%"></span></div> | 91,864.42 | 44,996 | 0.43 |
| 28 | pipeline | code-heavy | useNizel().text | 0.0104 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 10.5%"></span></div> | 98,975.10 | 48,176 | 0.45 |
| 29 | pipeline | small | useNizel().html | 0.0102 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 10.4%"></span></div> | 100,565.21 | 48,992 | 0.47 |
| 30 | pipeline | code-heavy | useNizel.preset("minimal").html | 0.0101 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 10.3%"></span></div> | 101,675.95 | 49,455 | 0.50 |
| 31 | pipeline | small | useNizel().text | 0.0098 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 10.0%"></span></div> | 104,797.24 | 50,800 | 0.51 |
| 32 | pipeline | small | useNizel.preset("minimal").html | 0.0087 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 8.9%"></span></div> | 117,934.15 | 57,248 | 0.48 |
| 33 | pipeline | small | useNizel().ast | 0.0083 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 8.4%"></span></div> | 123,581.80 | 60,243 | 0.46 |
| 34 | pipeline | small | useNizel().parse | 0.0081 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 8.2%"></span></div> | 126,851.92 | 61,594 | 0.49 |
| 35 | phase | code-heavy | parseMarkdown | 0.0080 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 8.2%"></span></div> | 135,723.78 | 62,136 | 1.28 |
| 36 | pipeline | code-heavy | useNizel().ast | 0.0080 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 8.1%"></span></div> | 130,661.84 | 62,702 | 0.55 |
| 37 | phase | small | parseMarkdown | 0.0079 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 8.1%"></span></div> | 128,977.38 | 62,921 | 0.44 |
| 38 | pipeline | code-heavy | useNizel().parse | 0.0073 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 7.5%"></span></div> | 139,781.10 | 68,158 | 0.35 |
| 39 | phase | readme | renderHtml | 0.0049 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 5.0%"></span></div> | 212,206.10 | 101,458 | 0.72 |
| 40 | phase | readme | collect | 0.0043 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 4.4%"></span></div> | 246,244.37 | 116,305 | 1.62 |
| 41 | inline | small | stripInlineMarkdown | 0.0039 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 4.0%"></span></div> | 261,309.00 | 126,595 | 0.51 |
| 42 | phase | gfm | renderHtml | 0.0039 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 4.0%"></span></div> | 264,336.24 | 127,212 | 0.60 |
| 43 | inline | small | parseInline | 0.0037 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 3.7%"></span></div> | 281,343.97 | 136,013 | 0.59 |
| 44 | pipeline | large | useNizel().meta | 0.0032 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 3.3%"></span></div> | 320,164.90 | 155,679 | 0.46 |
| 45 | pipeline | readme | useNizel().meta | 0.0032 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 3.2%"></span></div> | 337,595.49 | 157,805 | 0.85 |
| 46 | phase | code-heavy | renderHtml | 0.0031 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 3.2%"></span></div> | 330,197.20 | 160,486 | 0.44 |
| 47 | pipeline | code-heavy | useNizel().meta | 0.0031 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 3.1%"></span></div> | 339,574.45 | 162,108 | 0.57 |
| 48 | phase | gfm | collect | 0.0029 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 2.9%"></span></div> | 363,833.93 | 173,834 | 0.68 |
| 49 | pipeline | gfm | useNizel().meta | 0.0028 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 2.9%"></span></div> | 363,632.43 | 176,985 | 0.48 |
| 50 | pipeline | small | useNizel().meta | 0.0028 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 2.8%"></span></div> | 375,014.08 | 181,248 | 0.87 |
| 51 | phase | code-heavy | collect | 0.0025 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 2.6%"></span></div> | 407,025.84 | 198,944 | 0.37 |
| 52 | phase | large | renderTemplate | 0.0021 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 2.2%"></span></div> | 488,440.70 | 236,199 | 0.51 |
| 53 | phase | readme | renderTemplate | 0.0019 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.9%"></span></div> | 550,886.64 | 266,716 | 0.51 |
| 54 | phase | code-heavy | renderTemplate | 0.0018 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.8%"></span></div> | 571,356.54 | 277,886 | 0.43 |
| 55 | phase | gfm | renderTemplate | 0.0017 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.8%"></span></div> | 588,629.43 | 287,198 | 0.40 |
| 56 | phase | small | renderTemplate | 0.0017 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.7%"></span></div> | 625,606.80 | 302,870 | 0.48 |
| 57 | phase | small | renderHtml | 0.0015 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.5%"></span></div> | 699,827.50 | 337,249 | 0.68 |
| 58 | phase | small | collect | 0.0012 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.2%"></span></div> | 854,835.44 | 414,514 | 0.43 |
| 59 | inline | readme | stripInlineMarkdown | 0.0010 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.1%"></span></div> | 974,628.99 | 479,980 | 0.33 |
| 60 | inline | readme | parseInline | 0.0010 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 1.0%"></span></div> | 1,008,069.28 | 499,185 | 0.20 |
| 61 | phase | readme | extractFrontmatter | 0.0005 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 0.5%"></span></div> | 2,008,963.46 | 976,006 | 0.63 |
| 62 | phase | code-heavy | extractFrontmatter | 0.0005 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 0.5%"></span></div> | 2,015,057.52 | 982,338 | 0.56 |
| 63 | phase | small | extractFrontmatter | 0.0005 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 0.5%"></span></div> | 2,008,434.97 | 982,549 | 0.32 |
| 64 | phase | large | extractFrontmatter | 0.0005 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 0.5%"></span></div> | 2,024,933.29 | 982,855 | 1.13 |
| 65 | phase | gfm | extractFrontmatter | 0.0005 | <div class="benchmark-bar" aria-label="0.0"><span style="width: 0.5%"></span></div> | 2,017,985.09 | 984,306 | 0.44 |

## Running Benchmarks

The benchmark suite lives in `apps/benchmarks` and writes generated reports to `apps/benchmarks/results`. The result folder is ignored so local benchmark history does not pollute commits.

~~~bash
npm run benchmark -- --fixture=small,readme,large,gfm,code-heavy --mode=parse,render --label=local
npm run benchmark:nizel -- --fixture=small,readme,large,gfm,code-heavy --mode=pipeline,phase,inline --label=local
~~~

The root benchmark scripts rebuild Nizel before running. If you run the benchmark workspace directly, rebuild Nizel first when parser or renderer code changed:

~~~bash
npm run build --workspace nizel
~~~
