<template>
  <article :class="bemm()">
    <header :class="bemm('head')">
      <p :class="bemm('eyebrow')">Measured performance</p>
      <h1 :class="bemm('title')">Benchmarks</h1>
      <p :class="bemm('lede')">Results from the repository benchmark suite. These are local measurements, not guarantees; compare relative results and reproduce them on your target runtime.</p>
      <dl :class="bemm('metadata')"><div><dt>Run</dt><dd>1 September 2026</dd></div><div><dt>Runtime</dt><dd>Node 22.23 · Apple silicon</dd></div><div><dt>Fixtures</dt><dd>5 documents · 2 modes</dd></div><div><dt>Profile</dt><dd>700 ms · 300 ms warmup</dd></div></dl>
    </header>

    <section :class="bemm('section')" aria-labelledby="rankings-title">
      <div :class="bemm('section-head')"><h2 id="rankings-title">Engine rankings</h2><p>Geometric mean of relative speed. 100 means fastest for every fixture.</p></div>
      <div :class="bemm('ranking-grid')">
        <div v-for="ranking in rankings" :key="ranking.mode" :class="bemm('ranking')">
          <h3>{{ ranking.mode }}</h3>
          <div v-for="engine in ranking.engines" :key="engine.name" :class="bemm('engine')">
            <div :class="bemm('engine-label')"><strong>{{ engine.name }}</strong><span>{{ engine.score.toFixed(1) }} · {{ engine.wins }} wins</span></div>
            <div :class="bemm('track')"><span :class="bemm('bar', ['', engine.name === 'Nizel' ? 'nizel' : ''])" :style="{ width: `${engine.score}%` }" /></div>
          </div>
        </div>
      </div>
    </section>

    <section :class="bemm('section')" aria-labelledby="fixtures-title">
      <div :class="bemm('section-head')"><h2 id="fixtures-title">Nizel throughput</h2><p>Operations per second for the local Nizel build. Higher is better.</p></div>
      <div :class="bemm('table-wrap')"><table :class="bemm('table')"><thead><tr><th>Fixture</th><th>Parse</th><th>Render HTML</th></tr></thead><tbody><tr v-for="fixture in fixtures" :key="fixture.name"><th>{{ fixture.name }}</th><td>{{ fixture.parse }}</td><td>{{ fixture.render }}</td></tr></tbody></table></div>
    </section>

    <section :class="bemm('costs')" aria-labelledby="costs-title">
      <div><h2 id="costs-title">Internal cost summary</h2><p>Average mean duration from the separate 5 May function-suite baseline.</p></div>
      <dl :class="bemm('cost-list')"><div><dt>Pipeline</dt><dd>0.0257 ms</dd></div><div><dt>Parser phases</dt><dd>0.0081 ms</dd></div><div><dt>Inline parsing</dt><dd>0.0143 ms</dd></div></dl>
    </section>

    <section :class="bemm('method')" aria-labelledby="method-title">
      <div :class="bemm('method-copy')"><h2 id="method-title">Methodology</h2><p>Each engine receives the same source fixture. Parsers are initialized once before measurement. Parse mode returns the engine's document or token tree; render mode includes parsing and HTML generation. Shiki and other expensive presentation plugins are not enabled.</p></div>
      <dl :class="bemm('method-list')"><div><dt>Measurement</dt><dd>700 ms per task</dd></div><div><dt>Warmup</dt><dd>300 ms per task</dd></div><div><dt>Score</dt><dd>Geometric mean of relative throughput</dd></div><div><dt>Direction</dt><dd>Higher throughput and score are better</dd></div></dl>
      <div :class="bemm('reproduce')"><div><strong>Reproduce the comparison</strong><span>Run from the repository root after installing dependencies.</span></div><code>npm run benchmark -- --fixture=small,readme,large,gfm,code-heavy --mode=parse,render</code></div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { useBemm } from "bemm";
import type { BenchmarkEngine, BenchmarkFixture } from "./BenchmarkSummary.model";
const bemm = useBemm("benchmark-summary", { includeBaseClass: true });
const rankings: { mode: string; engines: BenchmarkEngine[] }[] = [
  { mode: "Parse", engines: [{ name: "Nizel", score: 86.4, wins: 2 }, { name: "markdown-it", score: 82.3, wins: 2 }, { name: "marked", score: 58.4, wins: 1 }, { name: "Comark", score: 31.6, wins: 0 }, { name: "remark", score: 1.1, wins: 0 }] },
  { mode: "Render", engines: [{ name: "markdown-it", score: 94.6, wins: 3 }, { name: "Nizel", score: 83.7, wins: 2 }, { name: "marked", score: 64, wins: 0 }, { name: "Comark", score: 23, wins: 0 }, { name: "remark", score: 1.6, wins: 0 }] },
];
const fixtures: BenchmarkFixture[] = [
  { name: "code-heavy", parse: "41,315 Hz", render: "25,945 Hz" }, { name: "GFM", parse: "15,842 Hz", render: "11,883 Hz" }, { name: "large", parse: "2,549 Hz", render: "2,391 Hz" }, { name: "README", parse: "18,684 Hz", render: "13,237 Hz" }, { name: "small", parse: "39,004 Hz", render: "30,476 Hz" },
];
</script>

<style lang="scss">
@use "@/styles/tone" as tone;
.benchmark-summary {
  &__head { max-width: 50rem; }
  &__eyebrow, &__title, &__lede { margin: 0; }
  &__eyebrow { color: tone.muted(); font-size: .625rem; font-weight: 600; letter-spacing: .045em; text-transform: uppercase; }
  &__title { margin-top: .5rem; font-size: clamp(2.5rem, 6vw, 4.5rem); letter-spacing: -.04em; line-height: 1; }
  &__lede { margin-top: 1.25rem; color: tone.muted(); font-size: 1.05rem; }
  &__metadata { display: flex; flex-wrap: wrap; gap: 1rem 2.5rem; margin: 2rem 0 0; }
  &__metadata div, &__cost-list div { display: flex; flex-direction: column; }
  &__metadata dt, &__cost-list dt { color: tone.muted(); font-size: .75rem; text-transform: uppercase; }
  &__metadata dd, &__cost-list dd { margin: .2rem 0 0; font-weight: 600; }
  &__section { margin-top: 5rem; }
  &__section-head { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 1.5rem; }
  &__section-head h2, &__section-head p, &__ranking h3, &__costs h2, &__costs p { margin: 0; }
  &__section-head h2, &__costs h2 { font-size: 1.75rem; }
  &__section-head p, &__costs p { color: tone.muted(); }
  &__ranking-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
  &__ranking { padding: 1.5rem; border-radius: 1rem; background: tone.surface(); }
  &__ranking h3 { margin-bottom: 1.5rem; }
  &__engine + &__engine { margin-top: 1rem; }
  &__engine-label { display: flex; justify-content: space-between; gap: 1rem; font-size: .82rem; }
  &__engine-label span { color: tone.muted(); }
  &__track { height: .5rem; margin-top: .4rem; overflow: hidden; border-radius: 999px; background: tone.selected(); }
  &__bar { display: block; height: 100%; border-radius: inherit; background: tone.muted(); }
  &__bar--nizel { background: var(--color-primary); }
  &__table-wrap { overflow-x: auto; border-block: 1px solid tone.selected(); }
  &__table { width: 100%; border-collapse: collapse; text-align: left; }
  &__table th, &__table td { padding: .85rem 1rem; border-bottom: 1px solid tone.selected(); }
  &__table thead th { color: tone.muted(); font-size: .75rem; text-transform: uppercase; }
  &__table tbody th { font-weight: 600; }
  &__costs { display: flex; align-items: start; justify-content: space-between; gap: 2rem; margin-top: 4rem; padding: 2rem; border-radius: 1rem; background: tone.surface(); }
  &__cost-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin: 0; }
  &__method { margin-top: 4rem; padding-top: 3rem; border-top: 1px solid tone.selected(); }
  &__method-copy h2, &__method-copy p { margin: 0; }
  &__method-copy h2 { font-size: 1.75rem; }
  &__method-copy p { max-width: 62ch; margin-top: .75rem; color: tone.muted(); }
  &__method-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem 2rem; margin: 2rem 0 0; }
  &__method-list div { display: flex; flex-direction: column; }
  &__method-list dt { color: tone.muted(); font-size: .72rem; text-transform: uppercase; }
  &__method-list dd { margin: .25rem 0 0; font-weight: 600; }
  &__reproduce { display: grid; grid-template-columns: minmax(12rem, .7fr) minmax(0, 1.3fr); gap: 2rem; margin-top: 2rem; padding: 1.5rem; border-radius: 1rem; background: tone.surface(); }
  &__reproduce div { display: flex; flex-direction: column; }
  &__reproduce span { margin-top: .35rem; color: tone.muted(); font-size: .85rem; }
  &__reproduce code { overflow-x: auto; padding: 1rem; border-radius: .7rem; background: #0d1117; color: #e6edf3; font-family: var(--font-family-mono); font-size: .78rem; white-space: nowrap; }
}
@media (max-width: 48rem) { .benchmark-summary { &__ranking-grid, &__method-list, &__reproduce { grid-template-columns: 1fr; } &__section-head, &__costs { align-items: flex-start; flex-direction: column; } &__cost-list { grid-template-columns: 1fr; } } }
</style>
