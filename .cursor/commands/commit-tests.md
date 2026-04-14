# Commit: Clean, Squash, and Commit Changes

Clean up artifacts, squash work into a single commit, optionally push.

## Input

- `/commit` — clean up, squash, commit
- `/commit --push` — also push to remote
- `/commit --branch=<name>` — create branch first

## Workflow

### Phase 1: Branch Guard
- If on `main`: stop and ask for a branch name
- If `--branch` provided: `git checkout -b <name>`

### Phase 2: Pre-Commit Cleanup
Delete: debug-screenshots, retry-videos, generated reports, runtime state, temp logs.
Never delete: source code, tests, docs, config, rules.

### Phase 3: Lint
```bash
npm run lint:fix
npm run lint
```

### Phase 4: Review Changes
`git diff --stat` + `git status`. Warn on sensitive files (.env, .kubeconfigs, .storage-states).

### Phase 5: Squash Commit
```bash
git add -A
git reset --soft origin/main  # if prior commits exist
git commit -m "$(cat <<'EOF'
<type>: <summary>
- bullet points
EOF
)"
```

### Phase 6: Post-Commit Verification
`git status` + `git log --oneline -3`

### Phase 7: Push (if `--push`)
`git push -u origin HEAD`

## Safety Rules
- NEVER commit to `main`
- NEVER force push
- NEVER commit .env, .kubeconfigs, .storage-states
- NEVER push unless explicitly requested
