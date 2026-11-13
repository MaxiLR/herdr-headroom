#!/usr/bin/env bash
# Install the headroom mod into the Herdr home, and optionally add it to a
# personal layout.
#
# Usage: scripts/install.sh [--dry-run] [--layout [name]]
#
# The Herdr home is $HERDR_APP_HOME, else ~/.config/herdr-app. It must exist:
# install Herdr and start it once first.
#
# A previous install in mods/headroom/ is moved to backups/headroom-<time>/
# first, outside mods/ so Herdr does not load the backup as a mod. mods/headroom/
# then holds exactly the files of this checkout's mods/headroom/, without the
# gpui-kit.d.ts and jsconfig.json Herdr writes itself. The vault in headroom/,
# beside mods/, is never read, copied or removed. When herdr-app is on PATH,
# the installed mod is checked with `herdr-app check`. No key is bound.
#
# --layout [name] (default herdr-headroom) writes layouts/<name>.json: the
# home's layouts/main.json with the headroom block added as the last child of
# sidebar-lists. The block is sized by the mod (props.fit): it starts at 111 px,
# one account with one bar, and the mod corrects it on its first measure.
# Nothing else in the layout changes. Herdr lists a layout under its file name
# and switches only to a name of letters, digits, - or _, so any other name is
# a usage error, refused before anything changes. It needs jq, never overwrites
# a layout and never switches to it; it prints the command that does.
#
# It prints one line per step: a mark, the step and what happened. --dry-run
# prints what each step would do, with every file it would change, add or
# remove, and changes nothing. Colors on a terminal only; NO_COLOR turns them
# off.
set -euo pipefail

MODULE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$MODULE_DIR/mods/headroom"
HERDR_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
DEST="$HERDR_HOME/mods/headroom"
BACKUPS="$HERDR_HOME/backups"
LAYOUTS="$HERDR_HOME/layouts"
MAIN="$LAYOUTS/main.json"
BLOCK='{"id": "headroom", "type": "block", "size": {"px": 111}, "min": 90, "content": {"mod": "headroom", "props": {"fit": "headroom"}}}'

if [[ -t 1 && -z "${NO_COLOR:-}" && "${TERM:-}" != dumb ]]; then
  BOLD=$'\033[1m' DIM=$'\033[2m' RESET=$'\033[0m'
  RED=$'\033[31m' GREEN=$'\033[32m' YELLOW=$'\033[33m'
  MAGENTA=$'\033[35m' CYAN=$'\033[36m'
else
  BOLD="" DIM="" RESET="" RED="" GREEN="" YELLOW="" MAGENTA="" CYAN=""
fi

# step <ok|plan|warn|fail> <title> <what happened>: one line.
step() {
  local mark color
  case "$1" in
    ok) mark="✔" color="$GREEN" ;;
    plan) mark="•" color="$CYAN" ;;
    warn) mark="!" color="$YELLOW" ;;
    fail) mark="✖" color="$RED" ;;
  esac
  printf '%s%s%s %s%s%s  %s%s%s\n' \
    "$color" "$mark" "$RESET" "$BOLD" "$2" "$RESET" "$DIM" "$3" "$RESET"
}

# detail <text>: a line under the step above it. A file line ("changed",
# "added" or "removed", then the file) gets its word in color.
detail() {
  local color=""
  case "$1" in
    "changed  "*) color="$YELLOW" ;;
    "added    "*) color="$GREEN" ;;
    "removed  "*) color="$RED" ;;
  esac
  if [[ -n "$color" ]]; then
    printf '    %s%s%s%s%s%s\n' "$color" "${1%% *}" "$RESET" "$DIM" "${1#"${1%% *}"}" "$RESET"
  else
    printf '    %s%s%s\n' "$DIM" "$1" "$RESET"
  fi
}

usage() {
  echo "usage: $0 [--dry-run] [--layout [name]]" >&2
  echo "  --layout [name]  layout to write (default herdr-headroom); names use letters, digits, - or _" >&2
  exit 2
}

dry_run=0
want_layout=0
layout_name="herdr-headroom"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) dry_run=1 ;;
    --layout)
      want_layout=1
      if [[ $# -gt 1 && "$2" != --* ]]; then
        if [[ ! "$2" =~ ^[A-Za-z0-9_-]+$ ]]; then
          echo "layout name '$2' refused: names use letters, digits, - or _" >&2
          usage
        fi
        layout_name="$2"
        shift
      fi
      ;;
    *) usage ;;
  esac
  shift
done

if [[ ! -d "$HERDR_HOME" ]]; then
  echo "Herdr home $HERDR_HOME does not exist." >&2
  echo "Install Herdr and start it once, then run this installer again." >&2
  exit 1
fi

if [[ $dry_run -eq 1 ]]; then
  printf '%sheadroom%s  %sHerdr mod → %s (dry run)%s\n' \
    "$BOLD$MAGENTA" "$RESET" "$DIM" "$HERDR_HOME" "$RESET"
else
  printf '%sheadroom%s  %sHerdr mod → %s%s\n' \
    "$BOLD$MAGENTA" "$RESET" "$DIM" "$HERDR_HOME" "$RESET"
fi

# The files of a mod folder, without the two Herdr writes itself.
mod_files() {
  (cd "$1" && find . -type f ! -name gpui-kit.d.ts ! -name jsconfig.json |
    sed 's|^\./||' | LC_ALL=C sort)
}

# What the copy changes in an existing install: one "changed|added|removed
# <file>" line per file that differs.
differences() {
  local file
  while IFS= read -r file; do
    cmp -s "$SOURCE/$file" "$DEST/$file" || echo "changed  $file"
  done < <(LC_ALL=C comm -12 <(mod_files "$SOURCE") <(mod_files "$DEST"))
  LC_ALL=C comm -23 <(mod_files "$SOURCE") <(mod_files "$DEST") | sed 's/^/added    /'
  LC_ALL=C comm -13 <(mod_files "$SOURCE") <(mod_files "$DEST") | sed 's/^/removed  /'
}

count="$(mod_files "$SOURCE" | wc -l | tr -d ' ')"

# A previous install is backed up under a name never used. A first install
# makes no backup.
backup=""
changes=""
if [[ -e "$DEST" ]]; then
  base="$BACKUPS/headroom-$(date +%Y%m%d-%H%M%S)"
  backup="$base"
  n=2
  while [[ -e "$backup" ]]; do
    backup="$base-$n"
    n=$((n + 1))
  done
  changes="$(differences)"
  if [[ -n "$changes" ]]; then
    tally() { grep -c "^$1 " <<<"$changes" || true; }
    summary="$(tally changed) changed, $(tally added) added, $(tally removed) removed"
  else
    summary="no file differs from the installed mod"
  fi
fi

# What to do with the layout: write (with the new layout in $layout_json),
# exists, no-main, invalid, no-lists or no-jq. Decided before anything
# changes, so a dry run reports the same.
layout_target="$LAYOUTS/$layout_name.json"
layout_state=""
layout_json=""
if [[ $want_layout -eq 1 ]]; then
  if [[ -e "$layout_target" ]]; then
    layout_state=exists
  elif ! command -v jq >/dev/null 2>&1; then
    layout_state=no-jq
  elif [[ ! -f "$MAIN" ]]; then
    layout_state=no-main
  elif ! jq -se 'length == 1' "$MAIN" >/dev/null 2>&1; then
    layout_state=invalid
  else
    layout_json="$(jq --argjson block "$BLOCK" '
      def fits:
        type == "object" and .id == "sidebar-lists"
        and (.children | type) == "array" and (.children | length) > 0;
      [path(.. | select(fits))] as $found
      | if ($found | length) == 0 then empty
        else ($found[0] + ["children"]) as $at
          | setpath($at; getpath($at) + [$block])
        end
    ' "$MAIN")"
    if [[ -n "$layout_json" ]]; then
      layout_state=write
    else
      layout_state=no-lists
    fi
  fi
fi

switch_command="herdr-app do layout.switch --name $layout_name"

# layout_report <written|would write>: the layout step's line.
layout_report() {
  local title="Add the layout $layout_name"
  case "$layout_state" in
    write)
      if [[ "$1" == written ]]; then
        step ok "$title" "$layout_target: main.json with headroom last in sidebar-lists"
      else
        step plan "$title" "would write $layout_target: main.json with headroom last in sidebar-lists"
      fi
      ;;
    exists)
      step warn "$title" "$layout_target already exists; left untouched"
      ;;
    no-jq)
      step warn "$title" "jq is not on PATH; no layout written"
      ;;
    no-main)
      step warn "$title" "no $MAIN to start from; no layout written"
      ;;
    invalid)
      step warn "$title" "$MAIN is not valid JSON; no layout written"
      ;;
    no-lists)
      step warn "$title" "$MAIN has no sidebar-lists node with children; no layout written"
      ;;
  esac
}

if [[ $dry_run -eq 1 ]]; then
  if [[ -n "$backup" ]]; then
    step plan "Back up the previous install" "would move $DEST to $backup"
    step plan "Copy the mod" "would copy $count files from $SOURCE to $DEST: $summary"
    if [[ -n "$changes" ]]; then
      while IFS= read -r line; do detail "$line"; done <<<"$changes"
    fi
  else
    step plan "Back up the previous install" "nothing to back up: first install"
    step plan "Copy the mod" "would copy $count files from $SOURCE to $DEST"
  fi
  [[ $want_layout -eq 0 ]] || layout_report "would write"
  if command -v herdr-app >/dev/null 2>&1; then
    step plan "Check the installed mod" "would run herdr-app check on $DEST"
  else
    step warn "Check the installed mod" "herdr-app is not on PATH; the check would be skipped"
  fi
  printf '%sDry run: nothing was changed.%s\n' "$BOLD" "$RESET"
  exit 0
fi

if [[ -n "$backup" ]]; then
  mkdir -p "$BACKUPS"
  mv "$DEST" "$backup"
  step ok "Back up the previous install" "$backup"
else
  step ok "Back up the previous install" "nothing to back up: first install"
fi

mkdir -p "$DEST"
cp -R "$SOURCE/." "$DEST/"
find "$DEST" -type f \( -name gpui-kit.d.ts -o -name jsconfig.json \) -delete
if [[ -n "$backup" ]]; then
  step ok "Copy the mod" "$count files to $DEST: $summary"
else
  step ok "Copy the mod" "$count files to $DEST"
fi

if [[ "$layout_state" == write ]]; then
  # noclobber: a layout that appeared meanwhile is still never overwritten.
  (set -o noclobber && printf '%s\n' "$layout_json" >"$layout_target")
fi
[[ $want_layout -eq 0 ]] || layout_report "written"

if command -v herdr-app >/dev/null 2>&1; then
  if said="$(herdr-app check "$DEST" 2>&1)"; then
    step ok "Check the installed mod" "herdr-app check passed"
  else
    # On the same stream as every other step, which decided the colors.
    step fail "Check the installed mod" "herdr-app check failed for $DEST"
    if [[ -n "$said" ]]; then
      while IFS= read -r line; do detail "$line"; done <<<"$said"
    fi
    exit 1
  fi
else
  step warn "Check the installed mod" "herdr-app is not on PATH; check skipped"
fi

if [[ "$layout_state" == write ]]; then
  printf '%sInstalled. Switch to the layout with: %s%s\n' "$BOLD" "$switch_command" "$RESET"
else
  printf '%sInstalled.%s\n' "$BOLD" "$RESET"
fi
