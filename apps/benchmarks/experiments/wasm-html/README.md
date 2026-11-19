# Nizel Wasm benchmarks

This benchmark compares the published JavaScript and opt-in Wasm package entry points. It measures full Markdown-to-HTML and HTML-to-Markdown calls, including encoding and decoding. It checks exact output equality and prints whether each document used Wasm or fell back.

Run from the Nizel repository root with workspace dependencies installed.

\`\`\`sh
npm run build --workspace nizel
node apps/benchmarks/experiments/wasm-html/benchmark.mjs
\`\`\`

The drafts exercise the supported subset at scale. The repository fixtures show what happens when a realistic document falls back. Timings are warmed medians from one process and exclude initial module compilation. See the [package documentation](../../../../packages/nizel/README.md) for supported syntax and API usage.
