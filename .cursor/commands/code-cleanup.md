# Code Cleanup: Remove Dead Code, Fix Conventions

Systematic cleanup across Playwright code.

## Input

- `/code-cleanup all`
- `/code-cleanup page-objects`
- `/code-cleanup step-drivers`
- `/code-cleanup tests`
- `/code-cleanup <specific-path>`

## Workflow

### Phase 1: Static Analysis
1. Unused imports
2. Dead methods (grep entire codebase for references)
3. Dead tests (skipped, commented, empty, duplicate)
4. Code duplication
5. Convention violations

### Phase 2: Apply Fixes
Dependency order: page objects → step drivers → tests → utilities.
Safety: grep before delete, check git blame for recent code.

### Phase 3: Validation
1. `npm run lint:fix`
2. `npx tsc --project playwright/tsconfig.json --noEmit`

### Phase 4: Report
Structured report with all changes made.

## Rules
- Read before write
- Grep before delete
- Don't change test logic
- Scope boundary: only `playwright/`
- **DO NOT commit**
