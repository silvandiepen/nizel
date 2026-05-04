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

- pnpm workspaces
- TypeScript
- Changesets
- GitHub Actions
- npm Trusted Publishing
- npm provenance

## npm authentication

Do not use `NPM_TOKEN`.

Nizel packages should use npm Trusted Publishing through GitHub Actions OIDC.

Each npm package must be configured on npmjs.com with this GitHub repository and the release workflow as its trusted publisher.

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

### Release

Runs on pushes to `main`.

Uses Changesets.

If there are unreleased changes, it opens or updates a release PR.

When the release PR is merged, it publishes packages to npm using Trusted Publishing.

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

The publish command should rely on npm Trusted Publishing and should not require an npm token.

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
    "access": "public",
    "provenance": true
  }
}
```

## Provenance

GitHub Actions should publish with npm provenance.

This improves trust in the published packages and aligns with Trusted Publishing.
