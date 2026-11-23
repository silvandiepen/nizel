# Release plan: 2.4

Owners update their sections every Monday. Anything unchecked by the freeze moves to 2.5.

## Editor

Scope for **editor** this cycle, in priority order.

1. Test iCloud conflict handling
   - [ ] Fix `htmlToMarkdown` round trips — see [notes](https://example.com/editor/1-0)
     - Blocked on: the Wasm preview fallback
     - Edge case: VoiceOver labels on the outline
     - Edge case: iCloud conflict handling
   - [x] Refactor VoiceOver labels on the outline — see [notes](https://example.com/editor/1-1)
     - Follow-up: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Edge case: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Fix iCloud conflict handling — see [notes](https://example.com/editor/1-2)
     - Question: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed the search index rebuild, so keep the old path behind a flag until it is measured.

2. Refactor iCloud conflict handling
   - [ ] Document dark mode contrast — see [notes](https://example.com/editor/2-0)
     - Question: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Ship the search index rebuild — see [notes](https://example.com/editor/2-1)
     - Edge case: the toolbar layout
     - Edge case: PDF export with tables
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
3. Test first-run hints
   - [ ] Refactor scroll sync on long notes — see [notes](https://example.com/editor/3-0)
     - Follow-up: the search index rebuild
     - Question: dark mode contrast
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [x] Review VoiceOver labels on the outline — see [notes](https://example.com/editor/3-1)
     - Follow-up: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: `htmlToMarkdown` round trips
   - [ ] Refactor PDF export with tables — see [notes](https://example.com/editor/3-2)
     - Question: the Wasm preview fallback
   - [x] Measure first-run hints — see [notes](https://example.com/editor/3-3)
     - Edge case: the toolbar layout
     - Follow-up: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: the search index rebuild

     Context: the last attempt regressed PDF export with tables, so keep the old path behind a flag until it is measured.

4. Fix the toolbar layout
   - [ ] Profile the Wasm preview fallback — see [notes](https://example.com/editor/4-0)
     - Follow-up: the Wasm preview fallback
     - Follow-up: first-run hints
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed PDF export with tables, so keep the old path behind a flag until it is measured.

   - [ ] Fix PDF export with tables — see [notes](https://example.com/editor/4-1)
     - Follow-up: first-run hints
   - [ ] Review scroll sync on long notes — see [notes](https://example.com/editor/4-2)
     - Edge case: iCloud conflict handling

     Context: the last attempt regressed first-run hints, so keep the old path behind a flag until it is measured.

   - [ ] Refactor the Wasm preview fallback — see [notes](https://example.com/editor/4-3)
     - Question: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Edge case: `htmlToMarkdown` round trips
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

> Freeze is on Friday; ping the channel before moving anything.

## Preview

Scope for **preview** this cycle, in priority order.

1. Ship the search index rebuild
   - [x] Review scroll sync on long notes — see [notes](https://example.com/preview/1-0)
     - Blocked on: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Edge case: `htmlToMarkdown` round trips
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [x] Ship dark mode contrast — see [notes](https://example.com/preview/1-1)
     - Blocked on: dark mode contrast
2. Measure the Wasm preview fallback
   - [x] Test dark mode contrast — see [notes](https://example.com/preview/2-0)
     - Question: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Edge case: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: dark mode contrast
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed VoiceOver labels on the outline, so keep the old path behind a flag until it is measured.

   - [ ] Profile the toolbar layout — see [notes](https://example.com/preview/2-1)
     - Follow-up: dark mode contrast
     - Blocked on: scroll sync on long notes
     - Blocked on: the toolbar layout
3. Refactor first-run hints
   - [x] Ship scroll sync on long notes — see [notes](https://example.com/preview/3-0)
     - Edge case: the search index rebuild
   - [ ] Test VoiceOver labels on the outline — see [notes](https://example.com/preview/3-1)
     - Edge case: iCloud conflict handling
     - Edge case: the search index rebuild
   - [x] Ship VoiceOver labels on the outline — see [notes](https://example.com/preview/3-2)
     - Blocked on: the search index rebuild
     - Question: the search index rebuild
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Test VoiceOver labels on the outline — see [notes](https://example.com/preview/3-3)
     - Question: first-run hints

     Context: the last attempt regressed first-run hints, so keep the old path behind a flag until it is measured.

4. Fix PDF export with tables
   - [x] Profile PDF export with tables — see [notes](https://example.com/preview/4-0)
     - Follow-up: VoiceOver labels on the outline
   - [x] Ship the search index rebuild — see [notes](https://example.com/preview/4-1)
     - Edge case: VoiceOver labels on the outline
   - [ ] Refactor iCloud conflict handling — see [notes](https://example.com/preview/4-2)
     - Question: the Wasm preview fallback
     - Edge case: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

> Freeze is on Friday; ping the channel before moving anything.

## Sync

Scope for **sync** this cycle, in priority order.

1. Document the Wasm preview fallback
   - [ ] Review `htmlToMarkdown` round trips — see [notes](https://example.com/sync/1-0)
     - Blocked on: PDF export with tables
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: PDF export with tables
   - [ ] Ship VoiceOver labels on the outline — see [notes](https://example.com/sync/1-1)
     - Question: scroll sync on long notes

     Context: the last attempt regressed VoiceOver labels on the outline, so keep the old path behind a flag until it is measured.

   - [ ] Measure the toolbar layout — see [notes](https://example.com/sync/1-2)
     - Edge case: `htmlToMarkdown` round trips
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: iCloud conflict handling
2. Measure first-run hints
   - [x] Ship first-run hints — see [notes](https://example.com/sync/2-0)
     - Blocked on: `htmlToMarkdown` round trips
     - Follow-up: the toolbar layout
     - Question: VoiceOver labels on the outline
   - [x] Ship PDF export with tables — see [notes](https://example.com/sync/2-1)
     - Blocked on: scroll sync on long notes
   - [ ] Document the toolbar layout — see [notes](https://example.com/sync/2-2)
     - Edge case: the toolbar layout
     - Blocked on: the search index rebuild

     Context: the last attempt regressed scroll sync on long notes, so keep the old path behind a flag until it is measured.

   - [ ] Review `htmlToMarkdown` round trips — see [notes](https://example.com/sync/2-3)
     - Question: `htmlToMarkdown` round trips
     - Blocked on: VoiceOver labels on the outline
     - Edge case: PDF export with tables
3. Measure iCloud conflict handling
   - [ ] Document the search index rebuild — see [notes](https://example.com/sync/3-0)
     - Blocked on: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: iCloud conflict handling
     - Blocked on: PDF export with tables

     Context: the last attempt regressed the toolbar layout, so keep the old path behind a flag until it is measured.

   - [ ] Refactor the toolbar layout — see [notes](https://example.com/sync/3-1)
     - Edge case: iCloud conflict handling
     - Edge case: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: scroll sync on long notes
   - [ ] Document PDF export with tables — see [notes](https://example.com/sync/3-2)
     - Blocked on: `htmlToMarkdown` round trips
     - Blocked on: iCloud conflict handling

     Context: the last attempt regressed the Wasm preview fallback, so keep the old path behind a flag until it is measured.

   - [x] Document `htmlToMarkdown` round trips — see [notes](https://example.com/sync/3-3)
     - Edge case: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: the toolbar layout
     - Question: dark mode contrast
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
4. Test the Wasm preview fallback
   - [ ] Document PDF export with tables — see [notes](https://example.com/sync/4-0)
     - Blocked on: the toolbar layout
     - Blocked on: iCloud conflict handling
     - Follow-up: iCloud conflict handling
   - [ ] Measure PDF export with tables — see [notes](https://example.com/sync/4-1)
     - Question: `htmlToMarkdown` round trips
     - Question: PDF export with tables
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed scroll sync on long notes, so keep the old path behind a flag until it is measured.


> Freeze is on Friday; ping the channel before moving anything.

## Export

Scope for **export** this cycle, in priority order.

1. Document first-run hints
   - [ ] Refactor iCloud conflict handling — see [notes](https://example.com/export/1-0)
     - Follow-up: PDF export with tables
     - Edge case: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: dark mode contrast
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Fix scroll sync on long notes — see [notes](https://example.com/export/1-1)
     - Edge case: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: `htmlToMarkdown` round trips
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed `htmlToMarkdown` round trips, so keep the old path behind a flag until it is measured.

2. Measure the search index rebuild
   - [x] Review `htmlToMarkdown` round trips — see [notes](https://example.com/export/2-0)
     - Blocked on: scroll sync on long notes
     - Question: first-run hints
     - Question: first-run hints
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Review PDF export with tables — see [notes](https://example.com/export/2-1)
     - Blocked on: VoiceOver labels on the outline
   - [x] Measure scroll sync on long notes — see [notes](https://example.com/export/2-2)
     - Edge case: dark mode contrast
     - Blocked on: the Wasm preview fallback
     - Question: the search index rebuild
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed `htmlToMarkdown` round trips, so keep the old path behind a flag until it is measured.

   - [ ] Measure dark mode contrast — see [notes](https://example.com/export/2-3)
     - Question: first-run hints
     - Blocked on: PDF export with tables
     - Edge case: dark mode contrast

     Context: the last attempt regressed dark mode contrast, so keep the old path behind a flag until it is measured.

3. Review PDF export with tables
   - [ ] Document dark mode contrast — see [notes](https://example.com/export/3-0)
     - Blocked on: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed iCloud conflict handling, so keep the old path behind a flag until it is measured.

   - [ ] Fix scroll sync on long notes — see [notes](https://example.com/export/3-1)
     - Edge case: scroll sync on long notes
     - Follow-up: the search index rebuild
   - [x] Refactor the toolbar layout — see [notes](https://example.com/export/3-2)
     - Question: the search index rebuild
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
4. Refactor iCloud conflict handling
   - [x] Test scroll sync on long notes — see [notes](https://example.com/export/4-0)
     - Edge case: first-run hints
     - Follow-up: first-run hints
     - Follow-up: VoiceOver labels on the outline
   - [ ] Test first-run hints — see [notes](https://example.com/export/4-1)
     - Blocked on: the Wasm preview fallback
     - Question: VoiceOver labels on the outline
   - [ ] Document the toolbar layout — see [notes](https://example.com/export/4-2)
     - Follow-up: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed first-run hints, so keep the old path behind a flag until it is measured.

   - [x] Profile first-run hints — see [notes](https://example.com/export/4-3)
     - Question: scroll sync on long notes

     Context: the last attempt regressed VoiceOver labels on the outline, so keep the old path behind a flag until it is measured.


> Freeze is on Friday; ping the channel before moving anything.

## Search

Scope for **search** this cycle, in priority order.

1. Document PDF export with tables
   - [ ] Ship VoiceOver labels on the outline — see [notes](https://example.com/search/1-0)
     - Follow-up: the Wasm preview fallback

     Context: the last attempt regressed first-run hints, so keep the old path behind a flag until it is measured.

   - [ ] Ship PDF export with tables — see [notes](https://example.com/search/1-1)
     - Question: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
2. Measure first-run hints
   - [ ] Document the Wasm preview fallback — see [notes](https://example.com/search/2-0)
     - Blocked on: dark mode contrast
     - Follow-up: the search index rebuild
     - Follow-up: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Profile the search index rebuild — see [notes](https://example.com/search/2-1)
     - Follow-up: the search index rebuild
     - Follow-up: PDF export with tables
   - [x] Review the toolbar layout — see [notes](https://example.com/search/2-2)
     - Question: the search index rebuild
3. Ship PDF export with tables
   - [ ] Ship scroll sync on long notes — see [notes](https://example.com/search/3-0)
     - Follow-up: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: VoiceOver labels on the outline
     - Follow-up: dark mode contrast
   - [x] Ship VoiceOver labels on the outline — see [notes](https://example.com/search/3-1)
     - Follow-up: VoiceOver labels on the outline
     - Question: first-run hints
     - Question: `htmlToMarkdown` round trips
   - [ ] Document iCloud conflict handling — see [notes](https://example.com/search/3-2)
     - Follow-up: first-run hints
     - Edge case: VoiceOver labels on the outline
     - Edge case: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Test the search index rebuild — see [notes](https://example.com/search/3-3)
     - Edge case: the search index rebuild
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
4. Ship the search index rebuild
   - [ ] Profile the search index rebuild — see [notes](https://example.com/search/4-0)
     - Follow-up: dark mode contrast
   - [x] Profile VoiceOver labels on the outline — see [notes](https://example.com/search/4-1)
     - Question: VoiceOver labels on the outline
     - Question: VoiceOver labels on the outline
     - Blocked on: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Review dark mode contrast — see [notes](https://example.com/search/4-2)
     - Blocked on: the Wasm preview fallback
     - Follow-up: the Wasm preview fallback
     - Blocked on: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

> Freeze is on Friday; ping the channel before moving anything.

## Settings

Scope for **settings** this cycle, in priority order.

1. Measure `htmlToMarkdown` round trips
   - [ ] Document the toolbar layout — see [notes](https://example.com/settings/1-0)
     - Edge case: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [x] Refactor scroll sync on long notes — see [notes](https://example.com/settings/1-1)
     - Question: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Edge case: the search index rebuild
     - Question: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
2. Ship first-run hints
   - [ ] Fix VoiceOver labels on the outline — see [notes](https://example.com/settings/2-0)
     - Question: VoiceOver labels on the outline
     - Question: dark mode contrast
     - Blocked on: VoiceOver labels on the outline
   - [ ] Review first-run hints — see [notes](https://example.com/settings/2-1)
     - Question: the toolbar layout
     - Edge case: VoiceOver labels on the outline
     - Edge case: iCloud conflict handling

     Context: the last attempt regressed scroll sync on long notes, so keep the old path behind a flag until it is measured.

3. Refactor first-run hints
   - [x] Measure first-run hints — see [notes](https://example.com/settings/3-0)
     - Follow-up: dark mode contrast
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: iCloud conflict handling
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Edge case: VoiceOver labels on the outline

     Context: the last attempt regressed `htmlToMarkdown` round trips, so keep the old path behind a flag until it is measured.

   - [x] Review VoiceOver labels on the outline — see [notes](https://example.com/settings/3-1)
     - Blocked on: the toolbar layout

     Context: the last attempt regressed dark mode contrast, so keep the old path behind a flag until it is measured.

4. Fix the Wasm preview fallback
   - [ ] Test the Wasm preview fallback — see [notes](https://example.com/settings/4-0)
     - Follow-up: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: first-run hints
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: iCloud conflict handling
   - [ ] Test first-run hints — see [notes](https://example.com/settings/4-1)
     - Edge case: VoiceOver labels on the outline
     - Blocked on: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed first-run hints, so keep the old path behind a flag until it is measured.


> Freeze is on Friday; ping the channel before moving anything.

## Onboarding

Scope for **onboarding** this cycle, in priority order.

1. Document the toolbar layout
   - [x] Review VoiceOver labels on the outline — see [notes](https://example.com/onboarding/1-0)
     - Blocked on: PDF export with tables
     - Follow-up: first-run hints
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Measure the Wasm preview fallback — see [notes](https://example.com/onboarding/1-1)
     - Edge case: `htmlToMarkdown` round trips
     - Follow-up: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [x] Measure scroll sync on long notes — see [notes](https://example.com/onboarding/1-2)
     - Question: the Wasm preview fallback
     - Edge case: VoiceOver labels on the outline

     Context: the last attempt regressed the Wasm preview fallback, so keep the old path behind a flag until it is measured.

   - [ ] Document the toolbar layout — see [notes](https://example.com/onboarding/1-3)
     - Blocked on: PDF export with tables

     Context: the last attempt regressed VoiceOver labels on the outline, so keep the old path behind a flag until it is measured.

2. Fix the toolbar layout
   - [ ] Test `htmlToMarkdown` round trips — see [notes](https://example.com/onboarding/2-0)
     - Question: the search index rebuild
     - Question: VoiceOver labels on the outline

     Context: the last attempt regressed scroll sync on long notes, so keep the old path behind a flag until it is measured.

   - [ ] Measure scroll sync on long notes — see [notes](https://example.com/onboarding/2-1)
     - Blocked on: VoiceOver labels on the outline
     - Edge case: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Review PDF export with tables — see [notes](https://example.com/onboarding/2-2)
     - Follow-up: the search index rebuild
     - Question: dark mode contrast
     - Edge case: the search index rebuild
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [x] Profile the search index rebuild — see [notes](https://example.com/onboarding/2-3)
     - Blocked on: dark mode contrast
     - Blocked on: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
3. Measure `htmlToMarkdown` round trips
   - [x] Refactor the toolbar layout — see [notes](https://example.com/onboarding/3-0)
     - Edge case: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Follow-up: scroll sync on long notes
   - [ ] Refactor iCloud conflict handling — see [notes](https://example.com/onboarding/3-1)
     - Follow-up: `htmlToMarkdown` round trips
4. Profile first-run hints
   - [x] Refactor the Wasm preview fallback — see [notes](https://example.com/onboarding/4-0)
     - Question: PDF export with tables
     - Edge case: the search index rebuild
     - Question: the search index rebuild

     Context: the last attempt regressed first-run hints, so keep the old path behind a flag until it is measured.

   - [x] Profile the search index rebuild — see [notes](https://example.com/onboarding/4-1)
     - Follow-up: the search index rebuild
   - [ ] Fix dark mode contrast — see [notes](https://example.com/onboarding/4-2)
     - Follow-up: the Wasm preview fallback
     - Follow-up: the Wasm preview fallback
     - Follow-up: scroll sync on long notes
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Profile dark mode contrast — see [notes](https://example.com/onboarding/4-3)
     - Question: the search index rebuild

     Context: the last attempt regressed `htmlToMarkdown` round trips, so keep the old path behind a flag until it is measured.


> Freeze is on Friday; ping the channel before moving anything.

## Accessibility

Scope for **accessibility** this cycle, in priority order.

1. Fix the Wasm preview fallback
   - [ ] Ship iCloud conflict handling — see [notes](https://example.com/accessibility/1-0)
     - Follow-up: dark mode contrast
     - Edge case: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [x] Profile `htmlToMarkdown` round trips — see [notes](https://example.com/accessibility/1-1)
     - Edge case: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed `htmlToMarkdown` round trips, so keep the old path behind a flag until it is measured.

   - [ ] Refactor the Wasm preview fallback — see [notes](https://example.com/accessibility/1-2)
     - Edge case: `htmlToMarkdown` round trips
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: scroll sync on long notes

     Context: the last attempt regressed iCloud conflict handling, so keep the old path behind a flag until it is measured.

   - [x] Document PDF export with tables — see [notes](https://example.com/accessibility/1-3)
     - Question: the toolbar layout
     - Edge case: `htmlToMarkdown` round trips
     - Blocked on: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
2. Refactor the search index rebuild
   - [ ] Refactor first-run hints — see [notes](https://example.com/accessibility/2-0)
     - Edge case: iCloud conflict handling
   - [ ] Review dark mode contrast — see [notes](https://example.com/accessibility/2-1)
     - Question: the Wasm preview fallback
   - [ ] Profile the search index rebuild — see [notes](https://example.com/accessibility/2-2)
     - Edge case: PDF export with tables
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Blocked on: PDF export with tables
     - Blocked on: the toolbar layout

     Context: the last attempt regressed PDF export with tables, so keep the old path behind a flag until it is measured.

3. Document first-run hints
   - [x] Profile iCloud conflict handling — see [notes](https://example.com/accessibility/3-0)
     - Follow-up: PDF export with tables
     - Blocked on: the Wasm preview fallback
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*

     Context: the last attempt regressed iCloud conflict handling, so keep the old path behind a flag until it is measured.

   - [x] Ship iCloud conflict handling — see [notes](https://example.com/accessibility/3-1)
     - Blocked on: the toolbar layout
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
     - Question: the toolbar layout
     - Edge case: VoiceOver labels on the outline
4. Refactor `htmlToMarkdown` round trips
   - [ ] Fix the toolbar layout — see [notes](https://example.com/accessibility/4-0)
     - Edge case: VoiceOver labels on the outline
     - Question: dark mode contrast
   - [ ] Fix PDF export with tables — see [notes](https://example.com/accessibility/4-1)
     - Edge case: PDF export with tables
     - Question: VoiceOver labels on the outline
       1. Reproduce on iPhone and iPad
       2. Capture a trace with *Instruments*
   - [ ] Fix iCloud conflict handling — see [notes](https://example.com/accessibility/4-2)
     - Follow-up: PDF export with tables
     - Edge case: scroll sync on long notes
     - Question: the search index rebuild

> Freeze is on Friday; ping the channel before moving anything.

