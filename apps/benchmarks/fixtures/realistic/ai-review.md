## Review: `feat(sync): resolve iCloud conflicts by modification date`

**Verdict:** request changes. The approach is sound, but two issues would lose user edits, and the tests miss the case that triggers them.

### Summary

This PR replaces the "keep both" conflict strategy with a last-writer-wins merge based on `NSFileVersion.modificationDate`. It also adds a `ConflictResolver` type, moves the version cleanup into `SyncCoordinator`, and deletes about 300 lines of the old sheet UI.

| Area | Change | Risk |
| --- | --- | --- |
| `ConflictResolver` | new, 180 lines | **high**: decides which edit survives |
| `SyncCoordinator` | cleanup moved here | medium |
| `ConflictSheet` | deleted | low |
| Tests | 6 new cases | gaps, see below |

### Findings

1. **Edits made offline can be discarded** (`ConflictResolver.swift:88`).
   The resolver compares `modificationDate` across devices, but those clocks are not synchronized. A device whose clock runs a few minutes behind always loses, even when its edit is the newer one.
   - Use the file version's `persistentIdentifier` ordering, or keep both versions when the dates are within a tolerance.
   - Add a test with two devices whose clocks differ by five minutes.
2. **Versions are removed before the merge is saved** (`SyncCoordinator.swift:142`).
   ```swift
   try NSFileVersion.removeOtherVersionsOfItem(at: url)
   try resolved.write(to: url)   // if this throws, the other version is already gone
   ```
   Swap the two calls, and only remove the other versions after the write succeeds.
3. *Minor:* `ConflictResolver.resolve(_:)` is `public` but only used inside the module; make it `internal`.
4. *Minor:* the log line at `SyncCoordinator.swift:97` prints the full file path, which includes the user's name. Log the file name only.

### Suggested change

```diff
-        try NSFileVersion.removeOtherVersionsOfItem(at: url)
-        try resolved.write(to: url)
+        try resolved.write(to: url)
+        try NSFileVersion.removeOtherVersionsOfItem(at: url)
```

### Tests

The six new cases all run on one simulated device, so they never exercise clock skew. Missing:

- [ ] two devices with clocks five minutes apart, the slower one edited last
- [ ] a write failure during the merge (the original must survive)
- [x] a conflict on a file that was renamed on the other device
- [ ] three or more versions at once

### Nits

- `ConflictResolver` could take a `Clock` so the tests can control time, as `AutosaveScheduler` already does.
- The deleted `ConflictSheet` strings are still in `Localizable.xcstrings`; remove them so translators don't keep working on them.
- The PR description says "keeps the newest edit" — worth adding *by modification date, which is the device's clock* so reviewers see the trade-off.

See the [sync design note](https://example.com/docs/sync#conflicts) and Apple's [file coordination guide](https://developer.apple.com/documentation/foundation/nsfileversion) for the version APIs.

> Happy to pair on the clock-skew test if useful — it needs two `NSFileVersion` fixtures with fixed dates.

---

## Follow-up after the second push

**Verdict:** approve with one change. Both blocking issues are fixed; one new problem came in with the fix for finding 2.

### What changed

- `resolved.write(to:)` now runs before `removeOtherVersionsOfItem(at:)`, and a failed write keeps every version. 👍
- Clock skew is handled with a **30-second tolerance**: inside it, both versions are kept and the user picks, as before.
- New tests cover skew (`testSlowerClockEditedLastKeepsBoth`) and a failed write (`testWriteFailureKeepsTheOriginal`).

### New finding

1. **The tolerance is applied to the absolute difference**, so a version that is 29 seconds *older* also triggers the picker.
   ```swift
   if abs(local.modificationDate.timeIntervalSince(remote.modificationDate)) < tolerance {
       return .keepBoth
   }
   ```
   That is intended (we can't tell which is newer inside the window), but the sheet copy says "a newer version exists", which is wrong half of the time. Change it to "another version exists" or show both dates.

### Remaining nits

- `tolerance` is a magic number in two places; move it to `SyncSettings.conflictTolerance`.
- `ConflictResolver.Outcome` has a `.merged` case that nothing returns any more.
- The test names use `Keeps` and `Retains` for the same thing; pick one.

| Check | Before | After |
| --- | --- | --- |
| Clock skew test | missing | **passes** |
| Failed write test | missing | **passes** |
| Full sync suite | 212 passed | 216 passed |
| Lines changed | +412 / −318 | +455 / −318 |

Ship it once the sheet copy is fixed. Thanks for turning this around quickly.

### Notes for the release

- Mention the behaviour change in the release notes: conflicts inside 30 seconds still ask, everything else resolves to the **newest edit by device clock**.
- QA should try two devices with the clock of one set five minutes back, edit on both offline, then reconnect; expected result: the picker appears only when the edits are within 30 seconds.
- Keep an eye on the `sync.conflict.resolved` metric for the first week; if `keepBoth` rises above ~2% the tolerance is too wide.

_Reviewed with the full diff and the CI logs from run `#4821`._
