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

The publish workflow versions packages before building:

1. `scripts/version-workspaces-for-publish.mjs` checks npm for every publishable package.
2. If the package version already exists on npm, the script bumps patch until it finds an unpublished version.
3. It updates the package `package.json` files and the matching workspace entries in `package-lock.json`.
4. Release notes are generated from the versioned tree.
5. CI builds and tests the versioned tree.
6. Packages are published to npm using Trusted Publishing.
7. Only after every publish step succeeds, the workflow commits the version files and release notes.

The workflow does not rely on manual version edits before merging to `main`.
If any publish step fails, the generated version files and release notes are not committed. Publish runs triggered by the workflow's own version/release-note commit are skipped so the version commit does not start another release loop.

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

Each package is versioned independently by `scripts/version-workspaces-for-publish.mjs`.

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

The publish command should rely on npm Trusted Publishing and should not require an npm token. Versioning happens before publish; the publish helper only publishes an unpublished version and skips a package if that exact version already exists.

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
