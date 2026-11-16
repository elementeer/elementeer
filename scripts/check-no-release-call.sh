#!/usr/bin/env bash
# Guard: no workflow of this repository may create or edit a release object.
#
# Release model (RFL-002, RFL-004, lvc-ops docs/release-flow-division.md): the
# ops-engine ReleaseHandler creates the release object on Forgejo on tag_push
# and mirrors it to the destinations declared in .ops.yaml. The ZIP asset is
# the engine's too (RFL-004 marks it "engine takes over"). A workflow under
# either workflow tree (.github/workflows, .forgejo/workflows) that creates or
# edits the release object — including attaching an asset to it — is drift.
#
# Two sections, both must hold:
#   1. no release-object writer in any workflow file
#   2. the gate and artifact jobs of RFL-004 are still there with the trigger
#      they had (tag 'v*' or a main push), so nothing was narrowed away
#
# Exit 0 when both hold, 1 otherwise. Dependency-free: bash, awk, grep, find.
#
# Usage: bash scripts/check-no-release-call.sh [--root PATH]
#
# --root scans another checkout. That is how the red proof runs this file
# against the base commit, where the writers still exist.

set -euo pipefail

ROOT="."
while [ $# -gt 0 ]; do
  case "$1" in
    --root)   ROOT="${2:-}"; shift 2 ;;
    --root=*) ROOT="${1#--root=}"; shift ;;
    *) echo "usage: bash scripts/check-no-release-call.sh [--root PATH]" >&2; exit 2 ;;
  esac
done

if [ ! -d "$ROOT" ]; then
  echo "FAIL root not found: $ROOT" >&2
  exit 2
fi

# Forms that create or edit a release object. The list is RFL-002's competing
# writer set plus the action names that write the same object; the engine is
# the only writer this organisation allows.
WRITER_ERE='gh[[:space:]]+release[[:space:]]+(create|edit|delete|upload)'
WRITER_ERE+='|uses:[[:space:]]*[^[:space:]]*(softprops/action-gh-release|actions/create-release|actions/upload-release-asset|ncipollo/release-action|marvinpinto/action-automatic-releases|goreleaser/goreleaser-action)'

# A write verb on a line that also names /releases. Asset attachment counts:
# the engine collects and attaches the artifact itself.
WRITE_VERB_ERE='(-X[[:space:]]*(POST|PATCH|PUT|DELETE)|--request[[:space:]]*(POST|PATCH|PUT|DELETE)|--method[[:space:]]*(POST|PATCH|PUT|DELETE)|method[[:space:]]*=[[:space:]]*["'\'']?(POST|PATCH|PUT|DELETE))'

# Join backslash continuations so a curl spread over several lines is judged as
# one logical line, then drop full-line comments: prose about the removal must
# not be mistaken for the removal itself.
join_logical_lines() {
  awk '
    {
      line = $0
      if (pending) { text = text " " line } else { text = line; start = NR }
      pending = (line ~ /\\[ \t]*$/)
      if (!pending) { printf "%d\t%s\n", start, text }
    }
    END { if (pending) printf "%d\t%s\n", start, text }
  ' "$1"
}

files=()
for dir in "$ROOT/.forgejo/workflows" "$ROOT/.github/workflows"; do
  [ -d "$dir" ] || continue
  while IFS= read -r f; do
    files+=("$f")
  done < <(find "$dir" -maxdepth 1 -type f \( -name '*.yml' -o -name '*.yaml' \) | sort)
done

if [ "${#files[@]}" -eq 0 ]; then
  echo "FAIL no workflow files found under $ROOT" >&2
  exit 1
fi

failures=0

echo "== no release-object writer =="
scanned=0
for f in "${files[@]}"; do
  scanned=$((scanned + 1))
  while IFS=$'\t' read -r lineno text; do
    trimmed="${text#"${text%%[![:space:]]*}"}"
    case "$trimmed" in \#*) continue ;; esac
    if grep -Eq "$WRITER_ERE" <<<"$text"; then
      printf 'release-object writer: %s:%s: %s\n' "$f" "$lineno" "$trimmed"
      failures=$((failures + 1))
    elif grep -Eq "$WRITE_VERB_ERE" <<<"$text" && grep -Fq '/releases' <<<"$text"; then
      printf 'release-object write: %s:%s: %s\n' "$f" "$lineno" "$trimmed"
      failures=$((failures + 1))
    fi
  done < <(join_logical_lines "$f")
done
echo "scanned $scanned workflow file(s)"

# Section 2: the gate and artifact jobs of RFL-004, with the trigger they had.
# kind 'tag' means push on tags matching v*; 'main' means push on main.
check_trigger_and_jobs() {
  local file="$1" kind="$2" jobs="$3" header job
  if [ ! -f "$file" ]; then
    echo "FAIL missing workflow: $file"
    failures=$((failures + 1))
    return
  fi
  header=$(awk '/^jobs:/{exit} {print}' "$file")
  case "$kind" in
    tag)
      if ! grep -Eq '^[[:space:]]+tags:' <<<"$header" || ! grep -Fq 'v*' <<<"$header"; then
        echo "FAIL $file: tag trigger 'v*' is gone"
        failures=$((failures + 1))
        return
      fi
      ;;
    main)
      if ! grep -Eq '^[[:space:]]+branches:' <<<"$header" || ! grep -Eq 'main' <<<"$header"; then
        echo "FAIL $file: main-branch trigger is gone"
        failures=$((failures + 1))
        return
      fi
      ;;
  esac
  for job in $jobs; do
    if grep -Eq "^  ${job}:" "$file"; then
      echo "ok   $file: trigger $kind, job '$job'"
    else
      echo "FAIL $file: job '$job' is gone"
      failures=$((failures + 1))
    fi
  done
}

echo "== gate and artifact jobs still trigger =="
check_trigger_and_jobs "$ROOT/.forgejo/workflows/release.yml" tag "validate"
check_trigger_and_jobs "$ROOT/.github/workflows/release-github.yml" tag "syntax build wp-test"
check_trigger_and_jobs "$ROOT/.forgejo/workflows/release-gate.yml" main "validate"

if [ "$failures" -ne 0 ]; then
  echo "FAIL: $failures violation(s) — the release object belongs to the ops-engine"
  exit 1
fi
echo "OK: no workflow writes a release object; the gate and artifact jobs are intact"
