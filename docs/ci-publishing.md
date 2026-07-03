# CI and Publishing

Nizel should use GitHub Actions for validation and npm publishing.

The repository is planned as a monorepo, so CI and publishing must work for all packages.

## Goals

- Validate every pull request.
- Build and test all packages.
- Publish changed packages to npm.
- Support core and first-party plugins from the same repository.
- Avoid accidental publishing.
- Keep package release flow simple enough for Codex to maintain.
- Use npm Trusted Publishing instead of long-lived npm tokens.

## Recommended stack

- npm workspaces
- TypeScript
- GitHub Actions
- npm Trusted Publishing
- npm provenance

## npm authentication

Do not use `NPM_TOKEN`.

Nizel packages should use npm Trusted Publishing through GitHub Actions OIDC.

Each npm package must be configured on npmjs.com with this GitHub repository and the release workflow as its trusted publisher.

Do not configure `actions/setup-node` with `registry-url` for the publish job. That path writes npm token-oriented auth config for `NODE_AUTH_TOKEN`, which conflicts with Trusted Publishing and can produce `E401 token is invalid` even when provenance signing succeeds.

Required GitHub Actions permissions:

```yaml
permissions:
  contents: write
  id-token: write
```

`id-token: write` allows npm to verify that the package is being published from the trusted GitHub workflow.

## Workflows

### CI

Runs on pull requests and pushes to `main`.

Checks:

- install dependencies
- typecheck
- lint
- test
- build

### Publish

Runs on pushes to `main`.

The publish workflow only releases packages that actually changed. Each publish is recorded with a per-package git tag (`<package-name>@<version>`), which the next run uses as its change baseline.

1. `scripts/version-workspaces-for-publish.mjs` builds the publish plan:
   - For each package, it finds the most recent `<name>@<version>` git tag.
   - It diffs the package directory against that tag. `dist/`, `*.tsbuildinfo`, and `node_modules/` are gitignored, so the diff reflects real source changes only.
   - A package is scheduled to publish if its own files changed, or if a workspace dependency it declares in `dependencies`, `peerDependencies`, or `optionalDependencies` is publishing this run (transitive).
   - Packages that changed are bumped to the next unpublished patch (or keep an already-unpublished repo version). Packages with no changes are left untouched.
   - The plan is written to `.publish-plan`; packages not in the plan are skipped by the publish step.
2. Release notes are generated from the versioned tree.
3. CI builds and tests the versioned tree.
4. Each package is published with `scripts/publish-workspace-if-new.mjs`, which only publishes the versions listed in the plan and skips everything else.
5. After every publish step succeeds, the workflow commits the version files and release notes.
6. `scripts/create-publish-tags.mjs` creates and pushes the `<name>@<version>` tags at that commit. Tagging happens after the version commit so the tag points at a tree whose `package.json` already matches the tagged version.

The workflow does not rely on manual version edits before merging to `main`.
If any publish step fails, the generated version files and release notes are not committed. Publish runs triggered by the workflow's own version/release-note commit are skipped so the version commit does not start another release loop.

### Bootstrap tags

Packages first published manually (for example to enable Trusted Publishing) have no baseline tag. On the first CI run after that, `publish-workspace-if-new.mjs` detects the published version without a tag and records a baseline tag without republishing. From then on the package only republishes when it changes.

### Change detection

A package republishes when:

- files under its own package directory changed since its last publish tag, or
- a workspace dependency is publishing in the same run.

Because every plugin depends on `nizel`, a change to core cascades to all plugins and to `nizel-kit`. Editing a single plugin republishes only that plugin (plus `nizel-plugin-gfm` and `nizel-kit` if they consume it).

## Package release model

Every package should have its own `package.json`.

```txt
packages/
  nizel/
    package.json
  plugin-shiki/
    package.json
  plugin-code-copy/
    package.json
  plugin-autolink/
    package.json
```

Each package is versioned independently by `scripts/version-workspaces-for-publish.mjs`, but only when it (or a workspace dependency) has changed since its last publish tag.

## Package names

Planned packages:

```txt
nizel
nizel-plugin-shiki
nizel-plugin-code-copy
nizel-plugin-autolink
nizel-plugin-docs
nizel-plugin-blog
nizel-plugin-email
```

## Version command

```bash
node scripts/version-workspaces-for-publish.mjs
```

Use `--dry-run` to inspect the next versions without writing files:

```bash
node scripts/version-workspaces-for-publish.mjs --dry-run
```

## Publish command

```bash
node scripts/publish-workspace-if-new.mjs nizel
```

The publish command should rely on npm Trusted Publishing and should not require an npm token. Versioning and the publish plan happen before publish; the publish helper only publishes versions listed in `.publish-plan`, records the resulting `<name>@<version>` tag in `.tag-plan`, and skips everything else. When there is no plan (local bootstrap), it falls back to publishing any unpublished version.

## First publish for new packages

New npm package names must exist before Trusted Publishing can be configured for them on npmjs.com.

For that one-time bootstrap, publish locally with normal npm authentication and without provenance:

```bash
NPM_PROVENANCE=false node scripts/publish-workspace-if-new.mjs nizel-plugin-example
```

After the package exists, configure npm Trusted Publishing for the package with this repository and `.github/workflows/publish.yml`. CI publishes should then use OIDC and provenance.

## Safety

Publishing should only happen from `main`.

Pull requests should never publish.

Packages should include:

```json
{
  "publishConfig": {
    "access": "public",
    "provenance": true
  }
}
```

## Provenance

GitHub Actions should publish with npm provenance.

This improves trust in the published packages and aligns with Trusted Publishing.
