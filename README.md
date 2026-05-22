# Playwright E2E Test Framework for OpenShift Console — v2.0

End-to-end testing template for OpenShift console plugins using Playwright with TypeScript.
Modelled after the [kubevirt-plugin](https://github.com/kubevirt-ui/kubevirt-plugin) test suite architecture.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Environment Configuration](#environment-configuration)
- [Authentication](#authentication)
- [Cursor Agentic Workflow](#cursor-agentic-workflow)
- [Documentation](#documentation)

---

<a id="architecture-overview"></a>
## Architecture Overview

The framework uses a simple two-layer architecture — no step driver wrappers, no Kubernetes SDK, no global setup scripts:

```
Tests (.spec.ts)
  ↓  import { test, expect } from '../src/fixtures'
Fixtures (src/fixtures/index.ts)
  ↓  test.extend<Fixtures> — injects page object instances directly
Pages (src/page-objects/)
     plain classes, page: Page injected via constructor
     use byTest() / byTestId() helpers from src/utils/locators.ts
```

K8s/cluster operations use `oc()` / `ocIgnore()` / `applyManifest()` shell wrappers from
`src/utils/oc.ts` (thin wrappers around `execSync`) — no Kubernetes SDK required.

### Key Design Principles

- **Plain page classes** — no base class inheritance, no `robustClick`, no loading-spinner logic
- **Direct fixture injection** — page objects arrive through `test.extend`, never imported in test files
- **`oc` shell wrappers** — cluster operations via `oc` CLI (`execSync`), keeping tests free of SDK setup
- **storageState for auth** — the `setup` project logs in once and saves `playwright/.auth/session.json`; all other projects reuse it
- **URL-first navigation** — page methods call `page.goto()` directly; tests navigate via page methods or `test.step` blocks

---

<a id="project-structure"></a>
## Project Structure

```
.                          # repo root
├── playwright.config.ts   # Playwright config (setup + gating + tier1 projects)
├── .env.example           # environment variable template
├── playwright/
│   ├── .auth/             # gitignored — storageState lives here
│   ├── src/
│   │   ├── fixtures/
│   │   │   └── index.ts           # test.extend with direct page-object injection
│   │   ├── page-objects/
│   │   │   ├── LoginPage.ts       # login + seedGuidedTourState
│   │   │   └── PageCommons.ts     # common console helpers
│   │   └── utils/
│   │       ├── constants.ts       # SECOND, MINUTE, shared selector IDs
│   │       ├── env.ts             # flat const env object
│   │       ├── locators.ts        # byTest(), byTestId()
│   │       ├── logger.ts          # stdout/stderr helpers
│   │       ├── oc.ts              # execSync-based oc wrappers
│   │       └── urls.ts            # URL-builder helpers
│   ├── tests/
│   │   ├── setup/
│   │   │   └── setup.spec.ts      # login + save storageState
│   │   ├── gating/
│   │   │   └── example.spec.ts    # smoke tests (replace with your own)
│   │   └── tier1/                 # functional feature tests
│   └── docs/                      # STD documents
└── .cursor/
    ├── rules/                     # AI agent rules (always-applied orchestrator)
    └── commands/                  # Custom /commands for Cursor chat
```

---

<a id="quick-start"></a>
## Quick Start

### 1. Install dependencies

```bash
npm install
npm run playwright-install   # installs Chromium
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your cluster credentials:

```bash
# Web Console URL
BRIDGE_BASE_ADDRESS=https://console-openshift-console.apps.my-cluster.example.com

# kubeadmin credentials
BRIDGE_KUBEADMIN_PASSWORD=your-password

# Cluster API URL (used by oc commands)
CLUSTER_URL=https://api.my-cluster.example.com:6443

# Test namespace
TEST_NS=pw-test-ns
```

### 3. Run tests

```bash
# Run all projects (setup → gating → tier1)
npm run test-playwright

# Interactive UI mode (recommended for development)
npm run test-playwright-ui

# Headed mode
npm run test-playwright-headed
```

---

<a id="running-tests"></a>
## Running Tests

### Test projects

The config defines three Playwright projects:

| Project | `testDir` | Runs after | Auth |
|---------|-----------|------------|------|
| `setup` | `tests/setup/` | — | None (performs login) |
| `gating` | `tests/gating/` | `setup` | `playwright/.auth/session.json` |
| `tier1` | `tests/tier1/` | `setup` | `playwright/.auth/session.json` |

### Run specific project

```bash
# Gating only
npm run test-playwright -- --project=gating

# Tier1 only
npm run test-playwright -- --project=tier1

# Single spec file
npm run test-playwright -- playwright/tests/gating/example.spec.ts
```

### Workers and parallelism

```bash
# Override worker count
WORKERS=2 npm run test-playwright

# Shard across CI runners
npm run test-playwright -- --shard=1/4
```

### Reports

After a test run, open the HTML report:

```bash
npm run playwright-report
```

JUnit XML is written to `playwright/test-results/results.xml` for CI.

---

<a id="writing-tests"></a>
## Writing Tests

### Basic structure

Always import `test` and `expect` from the fixture — never from `@playwright/test` directly:

```typescript
import { expect, test } from '../src/fixtures';

test.describe('My Feature', () => {
  test('ID(TICKET-001) does the thing', async ({ loginPage, pageCommons }) => {
    await pageCommons.expectUserDropdownVisible();
    // ... assertions
  });
});
```

### Available fixtures

| Fixture | Type | Purpose |
|---------|------|---------|
| `loginPage` | `LoginPage` | Login/logout, `seedGuidedTourState()` |
| `pageCommons` | `PageCommons` | Namespace switching, filtering, tabs, breadcrumbs |
| `page` | Playwright `Page` | Direct page access when no page object method exists |

### Creating a page object

Page objects are plain TypeScript classes. Constructor receives `page: Page`. Use `byTest` and `byTestId` for selectors:

```typescript
import { expect, Page } from '@playwright/test';
import { NAV_TIMEOUT } from '../utils/constants';
import { byTest, byTestId } from '../utils/locators';

const VM_LIST_TAB = 'vm-list-tab';

export class VMListPage {
  constructor(private readonly page: Page) {}

  async navigate(ns: string) {
    await this.page.goto(`/k8s/ns/${ns}/kubevirt.io~v1~VirtualMachine`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectRowVisible(vmName: string) {
    await expect(
      this.page.getByRole('row').filter({ hasText: vmName }),
    ).toBeVisible({ timeout: NAV_TIMEOUT });
  }
}
```

### Registering a page object in the fixture

Edit [`playwright/src/fixtures/index.ts`](playwright/src/fixtures/index.ts):

```typescript
import { VMListPage } from '../page-objects/VMListPage';

type Fixtures = {
  loginPage: LoginPage;
  pageCommons: PageCommons;
  vmList: VMListPage;        // add here
};

export const test = base.extend<Fixtures>({
  // ... existing fixtures ...
  vmList: async ({ page }, use) => {
    await use(new VMListPage(page));
  },
});
```

### Using `oc` for cluster operations

```typescript
import { applyManifest, deleteResource, ocIgnore } from '../src/utils/oc';

test.beforeAll(() => {
  applyManifest(`
    apiVersion: v1
    kind: Namespace
    metadata:
      name: my-test-ns
  `);
});

test.afterAll(() => {
  deleteResource('namespace', 'my-test-ns');
});
```

### Tier placement

| Tier | Where | Criteria |
|------|-------|----------|
| `gating` | `tests/gating/` | Smoke checks, no resource creation, < 2 min |
| `tier1` | `tests/tier1/` | CRUD workflows, resource creation, < 6 min |

---

<a id="environment-configuration"></a>
## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BRIDGE_BASE_ADDRESS` | Web console URL | `http://localhost:9000` |
| `BRIDGE_KUBEADMIN_PASSWORD` | kubeadmin password | — |
| `BRIDGE_HTPASSWD_USERNAME` | Login username | `kubeadmin` |
| `BRIDGE_HTPASSWD_IDP` | Identity provider name on login page | `kube:admin` |
| `CLUSTER_URL` | Cluster API URL (for `oc` commands) | — |
| `TEST_NS` | Namespace used by tests | `pw-test-ns` |
| `HEADED` | Any value runs browser in headed mode | — |
| `DEBUG_MODE` | `1` enables headed + skips retries | — |
| `WORKERS` | Number of parallel workers | `4` |
| `CI` | Set in CI environments (enables retry, forbids `.only`) | — |

---

<a id="authentication"></a>
## Authentication

Authentication is handled by the `setup` Playwright project (`tests/setup/setup.spec.ts`):

1. Navigates to `/` and checks if already authenticated
2. Selects the IDP from the login screen (matched by `BRIDGE_HTPASSWD_IDP`)
3. Fills username/password and submits
4. Saves the authenticated context to `playwright/.auth/session.json`

All subsequent projects (`gating`, `tier1`) load this file via `storageState` — no repeated login.

If the console URL is localhost, login is skipped (auth-disabled dev mode assumed).

### Troubleshooting authentication

- **Wrong IDP shown** — set `BRIDGE_HTPASSWD_IDP` to match the button text on the login page
- **Stale session** — delete `playwright/.auth/session.json` to force fresh login
- **Localhost** — login is automatically skipped; `storageState` is not used

---

<a id="cursor-agentic-workflow"></a>
## Cursor Agentic Workflow

This project includes a **multi-persona agentic workflow** powered by Cursor rules (`.cursor/rules/*.mdc`) and custom commands (`.cursor/commands/*.md`).

### Agent Personas

An **Orchestrator** (`orchestrator.mdc`, `alwaysApply: true`) routes every request to a specialized role:

| Role | Rule file | Responsibilities |
|------|-----------|-----------------|
| **QA Architect** | `qa-architect.mdc` | Framework design, page object gaps, tier placement, locator strategy |
| **Business Analyst** | `business-analyst.mdc` | Feature-to-scenario translation, STD documents |
| **Code Reviewer** | `code-reviewer.mdc` | Pattern compliance, locator strategy, lint enforcement |
| **Automation Implementer** | `automation-implementer.mdc` | Write tests, page objects, oc helpers |
| **Infrastructure Handler** | `infrastructure-handler.mdc` | Playwright config, environment, CI setup |
| **Test Executor** | `test-executor.mdc` | Run tests, result analysis, MCP debugging |
| **Git Handler** | `git-handler.mdc` | Pre-commit cleanup, squash commits |
| **UI Explorer** | `ui-exploration.mdc` | Explore live UI via MCP, produce coverage gap report |
| **Bug Hunter** | `bug-hunter.mdc` | Replay test-mapped workflows via MCP, find issues |
| **Code Cleanup** | `code-cleanup.mdc` | Remove dead code, unused imports, convention violations |
| **Cypress Migrator** | `cypress-migrator.mdc` | Translate Cypress tests to idiomatic Playwright |

### Custom Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `/test-fix-cycle` | Run → analyze → fix → iterate until stable | `/test-fix-cycle '@gating'` |
| `/health-check` | Read-only diagnostic run with failure classification | `/health-check '@tier1'` |
| `/debug-test` | Focused single-test debugging via MCP | `/debug-test TEMPLATE-001` |
| `/ui-exploration` | Discover untested UI features via MCP | `/ui-exploration vms --implement` |
| `/bug-hunt` | Replay workflows via MCP to find regressions | `/bug-hunt auth` |
| `/code-cleanup` | Systematic dead code removal | `/code-cleanup all` |
| `/commit-tests` | Clean artifacts, squash commit, optional push | `/commit-tests --push` |
| `/jira-task` | Full implementation flow from a Jira ticket | `/jira-task TICKET-12345` |
| `/expand-tests` | Add coverage to existing specs for a ticket | `/expand-tests TICKET-12345` |
| `/update-from-summary` | Update tests from a change description or ticket | `/update-from-summary TICKET-12345` |
| `/migrate` | Migrate a Cypress test file to Playwright | `/migrate cypress/tests/gating.cy.ts` |

### Key conventions enforced by agents

| Convention | Enforced by |
|-----------|-------------|
| `test`/`expect` imported from `../src/fixtures` (never `@playwright/test`) | Code Reviewer, Automation Implementer |
| Plain page classes — no `BasePage` inheritance | Code Reviewer, QA Architect |
| `byTest()`/`byTestId()` locator helpers | Code Reviewer, Automation Implementer |
| `oc`/`ocIgnore` for cluster operations (no SDK) | Automation Implementer, Cypress Migrator |
| UI-first navigation — `page.goto()` only in page methods | Automation Implementer |
| Test ID traceability (`ID(TICKET-XXXXX)`) | Business Analyst, QA Architect |
| Self-contained tests (create + cleanup own resources) | QA Architect, Cypress Migrator |

### MCP Integration

The project uses the **Playwright MCP** server for live browser interaction during debugging and exploration:

```json
{
  "mcpServers": {
    "Playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--ignore-https-errors"]
    }
  }
}
```

---

<a id="documentation"></a>
## Documentation

STD (Software Test Description) documents live in [`playwright/docs/`](playwright/docs/).

| Document | Description |
|----------|-------------|
| [`docs/STD-TEMPLATE.md`](playwright/docs/STD-TEMPLATE.md) | Template for new STD documents |
| [`docs/tier1/auth-and-navigation.md`](playwright/docs/tier1/auth-and-navigation.md) | Auth & Navigation STD |

---

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenShift Documentation](https://docs.openshift.com/)

---

**Node:** >= 22.x | **Playwright:** ^1.59.1 | **TypeScript:** 5.9.3
