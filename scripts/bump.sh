#!/usr/bin/env bash
# The real source of truth for the version is the git tag — vite.config.ts
# derives the manifest version from `git describe` at build time. This script is
# a convenience: it updates the package.json *fallback* (used only when git/tags
# are unavailable, e.g. a source-zip build), commits it, and creates the
# annotated tag that actually drives the version. Does NOT push — review and
# `git push --follow-tags` manually so the release workflow only fires when you
# mean it. (Tag-only is also fine: `git tag -a vX.Y.Z -m vX.Y.Z` without this.)
#
# Usage: ./scripts/bump.sh <version>
# Example: ./scripts/bump.sh 0.1.2

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <version>   (e.g. 0.1.2)" >&2
  exit 1
fi

VERSION="$1"

if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must be MAJOR.MINOR.PATCH (got: $VERSION)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Guard against an existing tag clobber.
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
  echo "Error: tag v$VERSION already exists" >&2
  exit 1
fi

# Refuse to run if package.json has unstaged edits — we'd accidentally
# pull those into the bump commit.
if ! git diff --quiet -- package.json; then
  echo "Error: package.json has unstaged changes. Stash or commit them first." >&2
  exit 1
fi

node -e "
  const fs = require('fs');
  const f = 'package.json';
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  j.version = '$VERSION';
  fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
"

git add package.json
git commit -m "chore: bump version to $VERSION"
git tag -a "v$VERSION" -m "v$VERSION"

echo
echo "Bumped to $VERSION and tagged v$VERSION."
echo "Push with:  git push --follow-tags"
