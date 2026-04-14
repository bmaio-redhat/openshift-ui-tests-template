# Health Check: Test Suite Diagnostic

Run a test suite and produce a read-only report. No fixes, no code changes.

## Input

- **Tag group**: `/health-check '@tier1'`
- **Spec path**: `/health-check playwright/tests/tier1/`
- **Optional workers**: `--workers=N`

## Workflow

### Phase 1: Pre-Flight
1. Verify setup artifacts exist (`.test-configs/`, `.storage-states/`, `.kubeconfigs/`)
2. If missing, run global setup first

### Phase 2: Execute Tests
```bash
PLAYWRIGHT_RETRIES=0 npm run test-playwright -- --grep "<tag>" --workers=<N>
```

### Phase 3: Parse Results
Extract pass/fail/skip counts. List every test with status.

### Phase 4: Classify Failures
Selector/UI Change, Timing/Flaky, Auth/Token, Cluster/Infra, Functional Regression, Test Code Bug.

### Phase 5: Report
Output: Header (cluster, scope, duration), Summary table, Failures table, Skipped tests, Recommendations.

## Rules
- **READ-ONLY** — do NOT modify any files
- Always `PLAYWRIGHT_RETRIES=0`
