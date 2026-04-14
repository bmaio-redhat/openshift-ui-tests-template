# UI Exploration: Discover Untested Features

Explore OpenShift console pages via Playwright MCP to find coverage gaps. Read-only by default.

## Input

- `/ui-exploration <page-or-feature>`
- `/ui-exploration <feature> --implement`

## Workflow

### Phase 1: UI Discovery (MCP)
1. Navigate to the target page
2. Snapshot accessibility tree
3. Explore sub-pages, tabs, menus
4. Document all data-test attributes and interactive elements

### Phase 2: Coverage Analysis
1. Search existing tests for coverage
2. Build a Coverage Map (tested vs untested)

### Phase 3: Gap Report
Summary, untested features table, recommended next steps.

### Phase 4: Implementation (with `--implement`)
1. Prioritize and determine tier placement
2. Present plan for user approval
3. Implement (Automation Implementer role)
4. Lint and type check

## Rules
- Default is read-only
- Match viewport to 1920×1080
- Use snapshots over screenshots for structure
