#!/usr/bin/env bash

set -euo pipefail

apply=false
base_ref="HEAD"
force=false

usage() {
  cat <<'EOF'
Usage: bash ./scripts/cleanup-merged-worktrees.sh [--base <git-ref>] [--apply] [--force]

Defaults to a dry run.
Use --apply to remove clean merged worktrees.
Use --apply --force to remove dirty merged worktrees too.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply)
      apply=true
      shift
      ;;
    --base)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --base." >&2
        echo >&2
        usage >&2
        exit 1
      fi

      base_ref="$2"
      shift 2
      ;;
    --force)
      force=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo >&2
      usage >&2
      exit 1
      ;;
  esac
done

current_worktree_path="$(git rev-parse --show-toplevel)"

declare -a candidate_branches=()
declare -a candidate_paths=()
declare -a candidate_statuses=()

current_path=""
current_branch=""

flush_current_worktree() {
  if [[ -z "$current_path" || -z "$current_branch" ]]; then
    current_path=""
    current_branch=""
    return
  fi

  if [[ "$current_path" == "$current_worktree_path" ]]; then
    current_path=""
    current_branch=""
    return
  fi

  if ! git merge-base --is-ancestor "$current_branch" "$base_ref"; then
    current_path=""
    current_branch=""
    return
  fi

  local status="clean"
  if [[ ! -d "$current_path" ]]; then
    status="missing"
  elif [[ -n "$(git -C "$current_path" status --short --untracked-files=no)" ]]; then
    status="dirty"
  fi

  candidate_branches+=("$current_branch")
  candidate_paths+=("$current_path")
  candidate_statuses+=("$status")

  current_path=""
  current_branch=""
}

while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ -z "$line" ]]; then
    flush_current_worktree
    continue
  fi

  case "$line" in
    worktree\ *)
      flush_current_worktree
      current_path="${line#worktree }"
      ;;
    branch\ refs/heads/*)
      current_branch="${line#branch refs/heads/}"
      ;;
  esac
done < <(git worktree list --porcelain)

flush_current_worktree

candidate_count="${#candidate_paths[@]}"
if [[ "$candidate_count" -eq 0 ]]; then
  echo "No merged worktrees found for base $base_ref."
  exit 0
fi

echo "Found $candidate_count merged worktree(s) for base $base_ref:"
for index in "${!candidate_paths[@]}"; do
  echo "- ${candidate_branches[$index]}: ${candidate_paths[$index]} (${candidate_statuses[$index]})"
done

if [[ "$apply" != true ]]; then
  echo
  echo "Dry run only. Re-run with --apply to remove clean worktrees, or --apply --force to remove dirty ones too."
  exit 0
fi

removed_count=0
skipped_dirty_count=0
missing_count=0

echo
for index in "${!candidate_paths[@]}"; do
  branch="${candidate_branches[$index]}"
  path="${candidate_paths[$index]}"
  status="${candidate_statuses[$index]}"

  if [[ "$status" == "missing" ]]; then
    echo "Worktree path already missing for $branch: $path"
    missing_count=$((missing_count + 1))
    continue
  fi

  if [[ "$status" == "dirty" && "$force" != true ]]; then
    echo "Skipping dirty worktree $branch: $path"
    skipped_dirty_count=$((skipped_dirty_count + 1))
    continue
  fi

  echo "Removing $branch: $path"
  if [[ "$force" == true ]]; then
    git worktree remove --force "$path"
  else
    git worktree remove "$path"
  fi
  removed_count=$((removed_count + 1))
done

if [[ "$removed_count" -gt 0 || "$missing_count" -gt 0 ]]; then
  echo
  echo "Pruning stale worktree metadata."
  git worktree prune
fi

if [[ "$removed_count" -eq 0 ]]; then
  echo
  echo "Nothing removed."
fi

if [[ "$skipped_dirty_count" -gt 0 ]]; then
  echo
  echo "Skipped $skipped_dirty_count dirty merged worktree(s). Re-run with --apply --force if that is intentional."
fi

if [[ "$missing_count" -gt 0 ]]; then
  echo
  echo "Found $missing_count merged worktree(s) that were already missing on disk. Their metadata is cleaned up by prune during apply runs."
fi
