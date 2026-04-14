# Test Fix Cycle: Run, Analyze, Fix, Repeat

Run a test suite by tag group, analyze failures, apply fixes or skips, and iterate until stable.

## Input

- **Tag group**: `'@gating'`, `'@tier1'`, etc. (tags in single quotes)
- **Spec path**: `playwright/tests/tier1/example/` or a specific file
- **Optional workers**: append `--workers=N` (default: 4)

Examples:
```
/test-fix-cycle '@tier1'
/test-fix-cycle playwright/tests/tier1/example/ --workers=2
```

## Workflow

### Phase 1: Initial Run
1. Build command: `PLAYWRIGHT_RETRIES=0 npm run test-playwright -- --grep "<tag>" --workers=<N>`
2. Save output for analysis

### Phase 2: Result Analysis
1. Parse pass/fail/skip counts
2. List failures with test name, file, error message
3. Classify: Selector Changed, Timing Issue, API/Auth Failure, Functional Regression, Test Code Bug

### Phase 3: Fix Cycle
For each fixable failure:
1. Read failing test + related page object/step driver
2. Diagnose using MCP (`Playwright-browser_snapshot`) for selector issues
3. Fix in the correct layer (selectors in PO, logic in SD, assertions in tests)
4. Run individual test to verify
5. If unfixable after 2 attempts: `test.skip(true, 'Descriptive reason')`

### Phase 4: Validation Run
Re-run full suite. Repeat until clean.

### Phase 5: Summary
Output results table with status and actions taken.

## Rules
- Always use `PLAYWRIGHT_RETRIES=0` during the cycle
- Use MCP for debugging before guessing at selectors
- Fix in the right layer
- Run `npm run lint:fix` after fixes
- **DO NOT commit**
