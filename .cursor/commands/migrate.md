# Migrate: Cypress to Playwright

Translate Cypress E2E tests into idiomatic Playwright code following the project's layered architecture.

## Input

- `/migrate <cypress-file-or-feature>` — full migration (analyze → implement → validate)
- `/migrate <cypress-file-or-feature> --analyze` — analysis only, produce migration plan
- `/migrate <cypress-file-or-feature> --dry-run` — generate code without writing files

### Examples

```
/migrate cypress/tests/tier1/virt-pages/bootable-volumes.cy.ts
/migrate bootable-volumes --analyze
/migrate cypress/tests/tier2/vm-tabs/ --dry-run
```

## Workflow

### Phase 1: Analysis
1. Read the Cypress file and all imported views, constants, types, and custom commands
2. Extract intent — document what each `it` block tests in plain language
3. Search existing page objects, step drivers, and clients for reusable methods
4. Identify gaps — missing locators, page object methods, step driver wrappers
5. Determine test isolation strategy (self-contained, shared resources, or API-created)
6. Produce a migration plan mapping Cypress blocks to Playwright components

**Stop here if `--analyze` was specified.**

### Phase 2: Selector Discovery (Playwright MCP)
1. Resize viewport to 1920×1080
2. Navigate to target pages in the live UI
3. Snapshot accessibility tree to discover `data-test` attributes and element roles
4. Verify interactive elements work (click, type)
5. Update migration plan with verified selectors

### Phase 3: Implementation
1. Create/extend page objects with locators and interaction methods
2. Create/extend step drivers with workflow wrappers (each public method in `this.step()`)
3. Write the spec file following project template:
   - `test.describe` with tags
   - `withAllure()` at test start
   - `ID(TICKET-XXXXX)` in test title
   - Self-contained: create → assert → cleanup in each `test()`
4. Run `npx tsc --noEmit` and `npm run lint:fix`

**Print code without writing if `--dry-run` was specified.**

### Phase 4: Validation
1. Run with `PLAYWRIGHT_RETRIES=0`
2. Debug failures using Playwright MCP (navigate → snapshot → console → network)
3. Verify no orphaned resources after run
4. Produce migration summary

## Key Translation Rules

- **Never transliterate** — understand intent, use idiomatic Playwright APIs
- **Self-contained tests** — merge sequential `it` blocks into one `test()` with `test.step()`
- **No fixed waits** — replace `cy.wait(ms)` with condition-based waits or assertion timeouts
- **No shell commands** — replace `cy.exec('oc ...')` with `KubernetesClient`
- **Framework-first** — use existing page objects and step drivers before creating new ones
- **Correct layer** — locators in page objects, workflow logic in step drivers, scenarios in specs

## Rules
- Always read the Cypress source before writing any code
- Use Playwright MCP to verify selectors against the live UI
- Follow `cypress-migrator.mdc` for API translation tables
- **DO NOT commit** — the user handles git operations
