#!/bin/bash
# SkillWeave Release Gate — tag version check
# Enforces: capability.yaml version == package.json version
#           new tag > existing tag on origin (semver)
#           tag does NOT already exist on origin (unless --force)
# Usage: bash scripts/release-check.sh [--force]

set -euo pipefail

FORCE="${1:-}"

# 1. Read versions
PKG_VER=$(python3 -c "import json; print(json.load(open('package.json'))['version'])" 2>/dev/null || echo "MISSING")
CAP_VER=$(grep "^version:" capability.yaml 2>/dev/null | awk '{print $2}' || echo "MISSING")

echo "  package.json:     $PKG_VER"
echo "  capability.yaml:  $CAP_VER"

# 2. Version sync gate
if [ "$PKG_VER" != "$CAP_VER" ]; then
    echo "❌ VERSION MISMATCH: package.json ($PKG_VER) != capability.yaml ($CAP_VER)"
    exit 1
fi

TAG="v$PKG_VER"
echo "  tag:              $TAG"

# 3. Check tag on origin (Forgejo source of truth)
ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
echo "  origin:           $ORIGIN_URL"

# Fetch tags silently
git fetch origin --tags --quiet 2>/dev/null || true

# Does tag already exist on origin?
if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
    if [ "$FORCE" = "--force" ]; then
        echo "⚠️  Tag $TAG already exists on origin — --force allowed, will overwrite"
    else
        echo "❌ Tag $TAG already exists on origin"
        echo "   Use --force to overwrite, or bump version higher"
        exit 1
    fi
fi

# Does a LOWER or EQUAL tag already exist on origin? (only warn if force)
HIGHEST_TAG=$(git tag -l 'v[0-9]*' --sort=-version:refname | head -1)
if [ -n "$HIGHEST_TAG" ]; then
    HIGHEST_NUM=$(echo "$HIGHEST_TAG" | sed 's/^v//')
    CURRENT_NUM="$PKG_VER"
    if [ "$(printf '%s\n%s' "$HIGHEST_NUM" "$CURRENT_NUM" | sort -V | tail -1)" = "$HIGHEST_NUM" ] && [ "$HIGHEST_NUM" != "$CURRENT_NUM" ]; then
        echo "⚠️  Highest origin tag: $HIGHEST_TAG — your $TAG is lower"
        echo "   Are you releasing on a different repo clone? Check origin."
    fi
fi

# 4. GitHub mirror check (secondary — warn only)
GITHUB_URL=$(git remote get-url origin 2>/dev/null | grep -c "github" || echo "0")
if [ "$GITHUB_URL" -gt 0 ]; then
    echo "⚠️  Remote origin points to GitHub, not Forgejo!"
    echo "   Forgejo (git.langevc.com) is the source of truth."
    echo "   Tag pushes should go to Forgejo first, then mirror to GitHub."
fi

echo "✅ Release check passed: $TAG ready"
