# Debug Test: Focused Single-Test Debugging

Debug a specific failing test using Playwright MCP as the primary tool.

## Input

- **By test ID**: `/debug-test TICKET-001`
- **By test name**: `/debug-test "Verify console login"`
- **By spec file**: `/debug-test example.spec.ts`

## Workflow

### Phase 1: Reproduce
1. Locate the test: `rg "TICKET-XXX" playwright/tests/ --type ts -l`
2. Run with `PLAYWRIGHT_RETRIES=0 npm run test-playwright -- --grep "ID(TICKET-XXX)" --workers=1`
3. If passes: report success. If fails: continue.

### Phase 2: Diagnose with MCP
1. Resize viewport to 1920×1080
2. Navigate to the failing page
3. Snapshot accessibility tree — compare with test selectors
4. Interact — reproduce the failing action
5. Check console errors and network failures
6. Identify root cause

### Phase 3: Apply Fix
Fix in correct layer: selectors in PO, waits in PO, logic in SD, assertions in test.
Run `npm run lint:fix`.

### Phase 4: Verify
Run the test 3 consecutive times. If all pass: report fix.

## Rules
- MCP first — always try browser tools before scripts
- Single test focus
- Fix in the right layer
- **DO NOT commit**
