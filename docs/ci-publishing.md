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

## Recommended stack

- pnpm workspaces
- TypeScript
- Changesets
- GitHub Actions
- npm provenance

## Required secrets

Add this repository secret in GitHub:

```txt
NPM_TOKEN
```

The token must be allowed to publish all Nizel packages.

## Workflows

### CI

Runs on pull requests and pushes to `main`.

Checks:

- install dependencies
- typecheck
- lint
- test
- build

### Release

Runs on pushes to `main`.

Uses Changesets.

If there are unreleased changes, it opens or updates a release PR.

When the release PR is merged, it publishes packages to npm.

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

Each package is versioned independently by Changesets.

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

## Publish command

```bash
pnpm changeset publish
```

## Version command

```bash
pnpm changeset version
```

## Safety

Publishing should only happen from `main`.

Pull requests should never publish.

Packages should include:

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

## Provenance

GitHub Actions should publish with npm provenance when possible.

This improves trust in the published packages.
