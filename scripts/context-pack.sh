#!/usr/bin/env bash
# context-pack.sh — assemble a session-start briefing for an AI agent.
#
# Requires: git, gh (authenticated). No network calls beyond gh.
#
# Usage:
#   scripts/context-pack.sh                  # full pack, stdout
#   scripts/context-pack.sh --max-tokens 4000 # degrade to fit a budget
#
# Degrade order when over --max-tokens: drop the commits section whole,
# then drop the tree section whole. AGENTS.md bodies and the ADR/issue
# index are never truncated mid-file — a section is emitted whole or not
# at all.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MAX_TOKENS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max-tokens)
      MAX_TOKENS="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# --- Gate: README.md's first line must declare public-safe sensitivity ---
if [[ ! -f README.md ]]; then
  echo "context-pack.sh: refusing to run — no README.md at repo root." >&2
  exit 1
fi
FIRST_LINE="$(head -n1 README.md)"
if [[ "$FIRST_LINE" != "Sensitivity: public-safe" ]]; then
  echo "context-pack.sh: refusing to run — README.md's first line must be exactly 'Sensitivity: public-safe' (found: '$FIRST_LINE')." >&2
  exit 1
fi

# --- crude token estimate: ~4 chars/token, no external deps ---
approx_tokens() {
  local chars
  chars=$(wc -m < "$1" 2>/dev/null || echo 0)
  echo $(( (chars + 3) / 4 ))
}

approx_tokens_str() {
  local chars=${#1}
  echo $(( (chars + 3) / 4 ))
}

TMP_AGENTS=$(mktemp)
TMP_ADRS=$(mktemp)
TMP_ISSUES=$(mktemp)
TMP_COMMITS=$(mktemp)
TMP_TREE=$(mktemp)
trap 'rm -f "$TMP_AGENTS" "$TMP_ADRS" "$TMP_ISSUES" "$TMP_COMMITS" "$TMP_TREE"' EXIT

# --- Section: AGENTS.md (root + scoped) ---
{
  echo "## AGENTS.md — /AGENTS.md"
  echo
  cat AGENTS.md
  echo
  while IFS= read -r -d '' scoped; do
    [[ "$scoped" == "./AGENTS.md" ]] && continue
    echo
    echo "## AGENTS.md — ${scoped#./}"
    echo
    cat "$scoped"
  done < <(find . -name AGENTS.md -not -path './node_modules/*' -not -path './frontend/node_modules/*' -not -path './.venv/*' -print0 | sort -z)
} > "$TMP_AGENTS"

# --- Section: ADR index (titles + status only) ---
{
  echo "## Decision index (docs/decisions/)"
  echo
  if [[ -d docs/decisions ]]; then
    for f in docs/decisions/*.md; do
      [[ -e "$f" ]] || continue
      title=$(grep -m1 '^# ' "$f" | sed 's/^# //')
      status=$(grep -m1 '^\*\*Status:\*\*' "$f" | sed 's/^\*\*Status:\*\* *//')
      printf -- '- %s — %s (%s)\n' "$(basename "$f")" "$title" "${status:-unknown}"
    done
  else
    echo "(no docs/decisions/ directory)"
  fi
} > "$TMP_ADRS"

# --- Section: open issues with labels ---
{
  echo "## Open issues"
  echo
  if command -v gh &>/dev/null; then
    gh issue list --state open --limit 200 \
      --json number,title,labels \
      --template '{{range .}}- #{{.number}} {{.title}} [{{range .labels}}{{.name}} {{end}}]
{{end}}' 2>/dev/null || echo "(gh issue list failed — not authenticated or no network access)"
  else
    echo "(gh CLI not available)"
  fi
} > "$TMP_ISSUES"

# --- Section: last 20 commits ---
{
  echo "## Last 20 commits"
  echo
  git log --oneline -20
} > "$TMP_COMMITS"

# --- Section: repo tree, excluding generated/vendored paths ---
{
  echo "## Repo tree"
  echo
  echo '```'
  git ls-files \
    | grep -vE '^(frontend/(node_modules|dist)/|node_modules/|\.venv/|__pycache__/|.*\.pyc$|life_os\.db)' \
    | sort
  echo '```'
} > "$TMP_TREE"

# --- Assemble, applying degrade order if over budget: commits first, then tree ---
INCLUDE_COMMITS=1
INCLUDE_TREE=1

if [[ -n "$MAX_TOKENS" ]]; then
  total() {
    cat "$TMP_AGENTS" "$TMP_ADRS" "$TMP_ISSUES" \
      $([[ $INCLUDE_COMMITS -eq 1 ]] && echo "$TMP_COMMITS") \
      $([[ $INCLUDE_TREE -eq 1 ]] && echo "$TMP_TREE") \
      | wc -m
  }
  chars=$(total)
  tokens=$(( (chars + 3) / 4 ))
  if [[ $tokens -gt $MAX_TOKENS ]]; then
    INCLUDE_COMMITS=0
    chars=$(total)
    tokens=$(( (chars + 3) / 4 ))
  fi
  if [[ $tokens -gt $MAX_TOKENS ]]; then
    INCLUDE_TREE=0
  fi
fi

echo "# Context pack — $(basename "$REPO_ROOT")"
echo
echo "Generated $(date -u +%Y-%m-%dT%H:%M:%SZ) by scripts/context-pack.sh"
echo
cat "$TMP_AGENTS"
echo
cat "$TMP_ADRS"
echo
cat "$TMP_ISSUES"
echo
if [[ $INCLUDE_COMMITS -eq 1 ]]; then
  cat "$TMP_COMMITS"
  echo
else
  echo "## Last 20 commits"
  echo
  echo "(dropped — over --max-tokens budget)"
  echo
fi
if [[ $INCLUDE_TREE -eq 1 ]]; then
  cat "$TMP_TREE"
else
  echo "## Repo tree"
  echo
  echo "(dropped — over --max-tokens budget)"
fi

echo
FINAL_CHARS=$(cat "$TMP_AGENTS" "$TMP_ADRS" "$TMP_ISSUES" \
  $([[ $INCLUDE_COMMITS -eq 1 ]] && echo "$TMP_COMMITS") \
  $([[ $INCLUDE_TREE -eq 1 ]] && echo "$TMP_TREE") | wc -m)
FINAL_TOKENS=$(( (FINAL_CHARS + 3) / 4 ))
echo "---"
echo "Approx. token count: $FINAL_TOKENS (chars/4 estimate, no tokenizer dependency)"
