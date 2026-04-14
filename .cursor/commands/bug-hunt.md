# Bug Hunt: Test-Driven UI Exploration

Replay test workflows via Playwright MCP to find bugs. Read-only.

## Input

`/bug-hunt <page-or-feature>`

## Workflow

1. **Build Interaction Plan** — read spec files, extract workflows
2. **Replay via MCP** — navigate, interact, check for issues at each step
3. **Document Issues** — category, severity, steps to reproduce, evidence
4. **Report** — summary, per-issue detail, recommendations

## Rules
- Read-only — no code changes
- Test-driven — replay from actual test cases
- Evidence-first — screenshot + snapshot for every issue
- Console + network checks at each step
