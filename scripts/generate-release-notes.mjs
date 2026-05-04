#!/usr/bin/env node

/**
 * Generate release notes from git commit history.
 *
 * Usage:
 *   node scripts/generate-release-notes.mjs [version]
 *
 * If version is not provided, reads from packages/nizel/package.json.
 *
 * Output: documentation/release-notes/<version>.md
 *
 * Environment:
 *   GITHUB_TOKEN - optional, for linking commits to PRs
 */

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const pkgPath = resolve(rootDir, "packages/nizel/package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const version = process.argv[2] ?? pkg.version;

const docsDir = resolve(rootDir, "documentation/release-notes");
const outputPath = resolve(docsDir, `v${version}.md`);

if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

// Get the latest tag to use as the base commit range
function getLatestTag() {
  try {
    return execSync("git describe --tags --abbrev=0", {
      cwd: rootDir,
      encoding: "utf-8",
    }).trim();
  } catch {
    // No tags yet — use initial commit
    return execSync("git rev-list --max-parents=0 HEAD", {
      cwd: rootDir,
      encoding: "utf-8",
    }).trim();
  }
}

const latestTag = getLatestTag();

// Get commits between last tag and HEAD
const commits = execSync(
  `git log ${latestTag}..HEAD --pretty=format:"%H|%s|%an|%ad" --date=short`,
  { cwd: rootDir, encoding: "utf-8" }
)
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const [hash, subject, author, date] = line.split("|");
    return { hash: hash.slice(0, 7), subject, author, date };
  });

// Categorize commits
const categories = {
  feat: [],
  fix: [],
  docs: [],
  refactor: [],
  perf: [],
  test: [],
  chore: [],
  other: [],
};

const prefixMap = {
  feat: "feat",
  fix: "fix",
  docs: "docs",
  refactor: "refactor",
  perf: "perf",
  test: "test",
  chore: "chore",
  ci: "chore",
  build: "chore",
};

for (const commit of commits) {
  const match = commit.subject.match(/^(\w+)(\([^)]*\))?:\s*(.+)/);
  if (match) {
    const prefix = match[1].toLowerCase();
    const scope = match[2] || "";
    const message = match[3];
    const category = prefixMap[prefix] || "other";
    categories[category].push({
      ...commit,
      message: scope ? `${scope}: ${message}` : message,
    });
  } else {
    categories.other.push(commit);
  }
}

const today = new Date().toISOString().split("T")[0];

// Build the markdown
let md = `---\ntitle: "${version}"\ndate: "${today}"\norder: 1\nhide: false\n---\n\n`;
md += `# ${version}\n\n`;
md += `Released on ${today}.\n\n`;

if (commits.length === 0) {
  md += "No changes since last release.\n";
} else {
  if (categories.feat.length > 0) {
    md += "## Added\n\n";
    for (const c of categories.feat) {
      md += `- ${c.message}\n`;
    }
    md += "\n";
  }

  if (categories.fix.length > 0) {
    md += "## Fixed\n\n";
    for (const c of categories.fix) {
      md += `- ${c.message}\n`;
    }
    md += "\n";
  }

  if (categories.perf.length > 0) {
    md += "## Improved\n\n";
    for (const c of categories.perf) {
      md += `- ${c.message}\n`;
    }
    md += "\n";
  }

  if (categories.refactor.length > 0) {
    md += "## Changed\n\n";
    for (const c of categories.refactor) {
      md += `- ${c.message}\n`;
    }
    md += "\n";
  }

  if (categories.docs.length > 0) {
    md += "## Documentation\n\n";
    for (const c of categories.docs) {
      md += `- ${c.message}\n`;
    }
    md += "\n";
  }

  if (categories.test.length > 0 || categories.chore.length > 0) {
    md += "## Internal\n\n";
    for (const c of [...categories.test, ...categories.chore]) {
      md += `- ${c.message}\n`;
    }
    md += "\n";
  }

  if (categories.other.length > 0) {
    md += "## Commits\n\n";
    for (const c of categories.other) {
      md += `- ${c.subject}\n`;
    }
    md += "\n";
  }
}

writeFileSync(outputPath, md);
console.log(`Generated: documentation/release-notes/v${version}.md`);
console.log(`  Base: ${latestTag}`);
console.log(`  Commits: ${commits.length}`);
