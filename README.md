# Playwright E2E Test Framework for OpenShift Console

End-to-end testing template for OpenShift console plugins using Playwright with TypeScript.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Environment Configuration](#environment-configuration)
- [Authentication Methods](#authentication-methods)
- [Cursor Agentic Workflow](#cursor-agentic-workflow)
  - [Agent Personas](#agent-personas)
  - [Custom Commands](#custom-commands)
  - [Multi-Role Workflows](#multi-role-workflows)
  - [MCP Integration](#mcp-integration)
- [Documentation](#documentation)

---

<a id="architecture-overview"></a>
## 🏗️ Architecture Overview

This framework follows a layered architecture pattern using the **StepDriver** pattern for maximum maintainability and reusability:

```
┌─────────────────────────────────────────────────┐
│  Tests (.spec.ts)                               │  ← High-level test scenarios
│  - Describes user flows                         │
│  - Uses StepDrivers for actions                 │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  StepDrivers (src/step-drivers/)                │  ← Unified action layer
│  - Combines Steps + Driver logic                │
│  - High-level operations with test.step         │
│  - Manages test state/context (type-safe keys)  │
│  - Uses Page Objects & Clients directly         │
└─────────────────────────────────────────────────┘
          ↓                       ↓
┌─────────────────────┐   ┌─────────────────────────────┐
│  Page Objects       │   │  Clients (src/clients/)     │
│  (src/page-objects/)│   │                             │
│                     │   │  ┌─────────────────────────┐│
│  ← UI Layer         │   │  │ KubernetesClient        ││ ← K8s API
│  - Playwright page  │   │  │ - @kubernetes/client    ││
│  - Selectors        │   │  │ - Token authentication  ││
│  - Element actions  │   │  │ - Namespace & resource   ││
│                     │   │  │   CRUD operations       ││
│                     │   │  └─────────────────────────┘│
└─────────────────────┘   └─────────────────────────────┘
          ↓                       ↓
┌─────────────────────────────────────────────────┐
│  OpenShift / Kubernetes Cluster                 │
│  - Web Console (UI)                             │
│  - API Server (REST)                            │
└─────────────────────────────────────────────────┘
```

### Key Design Principles

- **Separation of Concerns:** Each layer has a specific responsibility
- **Unified StepDrivers:** Single class per feature combining action logic and step reporting
- **Reusability:** Components can be used across multiple tests
- **Maintainability:** Changes in one layer don't affect others
- **Testability:** Each layer can be tested independently
- **Type Safety:** Full TypeScript support throughout

---

<a id="project-structure"></a>
## 📁 Project Structure

### Core Configuration
- **`playwright.config.ts`** - Playwright configuration and test settings
- **`tsconfig.json`** - TypeScript configuration for the test framework

### Test Specifications (`tests/`)
Contains the actual test files that define test scenarios and user flows. Each `.spec.ts` file focuses on a specific feature area. Tests are organized by tier (`tier1/`, `tier2/`, etc.).

### Source Code (`src/`)
The main implementation organized into focused modules:

- **`step-drivers/`** - Unified action layer combining step reporting and orchestration logic
- **`page-objects/`** - UI interaction layer implementing the Page Object Model pattern
- **`clients/`** - API clients for interacting with OpenShift/Kubernetes clusters
- **`context-managers/`** - State management system for sharing data between test components using type-safe ContextKey enum
- **`utils/`** - Utility modules providing shared functionality across the test framework

### Project Dependencies (`project-dependencies/`)
Global setup and teardown scripts that run once per test run: cluster auth and kubeconfig generation, test namespace creation, browser login and storage state persistence, shared config for workers, and post-run resource and artifact cleanup.

### Generated Content
- **`test-results/`** - Test execution results (gitignored)
- **`allure-results/`** - Allure test results (gitignored)
- **`allure-report/`** - Allure HTML report (gitignored)
- **`junit-results/`** - JUnit XML results (gitignored)

---

<a id="quick-start"></a>
## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install

npx playwright install chromium
```

### 2. Configure Environment

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` with your cluster credentials:

```bash
# Required: Authentication
OPENSHIFT_USERNAME=kubeadmin
OPENSHIFT_PASSWORD=your-password

# Required: Cluster information (for URL construction)
CLUSTER_NAME=mycluster
CLUSTER_DOMAIN=example.com

# Optional: Explicit URL (overrides auto-construction)
WEB_CONSOLE_URL=https://console-openshift-console.apps.mycluster.example.com/

# Optional: Test configuration
TEST_NS=pw-test-ns
```

### 3. Run Tests

```bash
# Run all tests
npm run test-playwright

# Run with UI mode (recommended for development)
npm run test-playwright-ui

# Run specific test file
npm run test-playwright -- tests/tier1/example/example.spec.ts
```

---

<a id="running-tests"></a>
## 🧪 Running Tests

### Development

```bash
# Interactive UI mode - best for development
npm run test-playwright-ui

# Headed mode - see browser actions
npm run test-playwright-headed

# Debug mode - with Playwright Inspector
npm run test-playwright-debug

# Debug mode - minimal setup/teardown (faster iterations)
DEBUG=1 npm run test-playwright
```

### CI/CD

```bash
# Headless mode with retries
npm run test-playwright

# Run with specific tag
npm run test-playwright -- --grep @tier1

# Run specific test file
npm run test-playwright -- tests/tier1/example/example.spec.ts
```

### Parallel Execution (Sharded Tests)

```bash
# Run shard 1 of 4
npm run test-playwright -- --shard=1/4

# Specify worker count
npm run test-playwright -- --workers=4
```

### Viewing Results

#### Allure Report (Primary)

This framework uses **Allure** as the main test reporter, providing rich test reports with:
- Detailed test execution history and trends
- Test suite grouping and categorization
- Step-by-step execution details
- Screenshots and attachments
- Retry and failure analysis

```bash
# Generate and view Allure report (requires allure CLI)
allure generate allure-results --clean -o allure-report
allure open allure-report
```

**Report locations:**
- `allure-results/` - Raw test results (auto-generated after each test run)
- `allure-report/` - Generated HTML report

#### Playwright HTML Report (Alternative)

```bash
npm run test-playwright-report
```

---

<a id="writing-tests"></a>
## ✍️ Writing Tests

### Basic Test Structure

```typescript
import PageCommons from '@/page-objects/page-commons';
import LoginStepDriver from '@/step-drivers/login-step-driver';
import { withAllure } from '@/utils/allure';
import { EnvVariables } from '@/utils/env-variables';
import test, { expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('ID(TICKET-001) should verify feature behavior @tier1', async ({ page }) => {
    await withAllure({ suite: 'Feature Name', feature: 'Tier 1', tags: ['@tier1'] });

    const loginDriver = LoginStepDriver.Init(page);
    const commons = new PageCommons(page);

    await test.step('Login to console', async () => {
      await loginDriver.performKubeAdminLogin();
      await page.waitForLoadState('load');
    });

    await test.step('Navigate to target page', async () => {
      await page.goto('/k8s/cluster/projects');
      await page.waitForLoadState('load');
    });

    await test.step('Verify expected state', async () => {
      const titleVisible = await commons.verifyTitle('Projects');
      expect(titleVisible).toBeTruthy();
    });
  });
});
```

### Extending the Framework

To add tests for your console plugin:

1. **Create page objects** in `src/page-objects/` extending `BasePage` or `PageCommons`
2. **Create step drivers** in `src/step-drivers/` extending `BasePageStepDriver` or `BaseClientStepDriver`
3. **Add API operations** by extending `KubernetesClient` with handler modules in `src/clients/handlers/`
4. **Write tests** in `tests/` using your step drivers

#### Custom Page Object

```typescript
import { Page } from '@playwright/test';
import PageCommons from './page-commons';

export default class MyFeaturePage extends PageCommons {
  private readonly _featureHeading = this.locator('h1:has-text("My Feature")');

  constructor(page: Page) {
    super(page);
  }

  async navigateToFeature(namespace: string) {
    await this.goTo(`/k8s/ns/${namespace}/my-feature`);
  }

  async isFeatureHeadingVisible(): Promise<boolean> {
    return this.verifyTextVisible('My Feature');
  }
}
```

#### Custom Step Driver

```typescript
import { Page } from '@playwright/test';
import MyFeaturePage from '@/page-objects/my-feature-page';
import BasePageStepDriver from './base-page-step-driver';

export default class MyFeatureStepDriver extends BasePageStepDriver<MyFeaturePage> {
  constructor(page: Page) {
    super(page, MyFeaturePage);
  }

  async navigateToFeature() {
    return await this.step('Navigate to My Feature', async () => {
      const namespace = this.getStoreKeyVal('testNamespace') ?? 'default';
      await this.pageObject.navigateToFeature(namespace);
    });
  }
}
```

### Available StepDrivers

- **LoginStepDriver** - Console authentication (kube:admin / test user login, logout)

### Available Page Objects

- **BasePage** - Core page interaction (robust click, loading indicators, text verification)
- **PageCommons** - Common OpenShift console operations (modals, YAML editor, namespace switching, perspective switching, filters, breadcrumbs)
- **LoginPage** - Login page interactions (IDP selection, form submission, logout)

### Available Clients

- **KubernetesClient** - Kubernetes API operations (namespace CRUD, ConfigMap management, custom resource CRUD, pod listing, console user settings, OAuth token generation, kubeconfig management)

---

<a id="environment-configuration"></a>
## ⚙️ Environment Configuration

### Required Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENSHIFT_USERNAME` | Cluster username for authentication | `kubeadmin` |
| `OPENSHIFT_PASSWORD` | Cluster password for authentication (or `BRIDGE_KUBEADMIN_PASSWORD`) | `password` |

**Note:** Either provide explicit URLs (`WEB_CONSOLE_URL` and `CLUSTER_URL`) OR provide `CLUSTER_NAME` and `CLUSTER_DOMAIN` for automatic URL construction.

### URL Configuration Variables

The framework supports flexible URL configuration with automatic construction from cluster name and domain.

#### Web Console URL

| Variable | Description | Priority Order |
|----------|-------------|----------------|
| `WEB_CONSOLE_URL` | Web console URL (highest priority) | 1. Explicit value<br>2. `BASE_URL` (fallback)<br>3. `BRIDGE_BASE_ADDRESS` (fallback)<br>4. Constructed: `https://console-openshift-console.apps.{CLUSTER_NAME}.{CLUSTER_DOMAIN}/`<br>5. Default: `http://localhost:9000` |

#### Cluster API URL

| Variable | Description | Priority Order |
|----------|-------------|----------------|
| `CLUSTER_URL` | OpenShift API URL (highest priority) | 1. Explicit value<br>2. `OPENSHIFT_CLUSTER_URL` (fallback)<br>3. Constructed: `https://api.{CLUSTER_NAME}.{CLUSTER_DOMAIN}:6443`<br>4. Default: `https://api.cluster.local:6443` |

#### URL Construction Variables

| Variable | Description | Usage |
|----------|-------------|-------|
| `CLUSTER_NAME` | Cluster name for URL construction | Used to construct URLs when explicit URLs are not provided |
| `CLUSTER_DOMAIN` | Cluster domain for URL construction | Used to construct URLs when explicit URLs are not provided |

**URL Construction Examples:**

```bash
export CLUSTER_NAME=my-cluster
export CLUSTER_DOMAIN=example.com
```

This automatically constructs:
- **Cluster API URL**: `https://api.my-cluster.example.com:6443`
- **Console URL**: `https://console-openshift-console.apps.my-cluster.example.com/`

Explicit URL variables always take precedence over constructed URLs.

> **⚠️ Important: URL Consistency for Remote Clusters**
>
> When testing against a remote cluster, `WEB_CONSOLE_URL` and `CLUSTER_URL` **must point to the same cluster**. The framework performs UI login on `WEB_CONSOLE_URL` and saves the authentication state. API operations use credentials from `CLUSTER_URL`. If these point to different clusters, authentication will fail.

### Optional Variables

#### Test Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_NS` | Test namespace for test resources | `pw-test-ns` |
| `NON_PRIV` | Run as non-privileged user (`test` user) | `0` |
| `IGNORE_WELCOME` | Skip welcome modal dismissal in setup | `1` |

#### Advanced Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `KUBECONFIG` | Path to kubeconfig file | Auto-generated if not provided |
| `DEBUG` | Enable debug mode (skips cleanup, headed browser) | `0` |
| `CI` | Indicates CI/CD environment (affects retry behavior) | `0` |
| `PLAYWRIGHT_RETRIES` | Number of retries for failed tests | `1` |
| `PLAYWRIGHT_VIDEO` | Enable video recording | `0` |
| `USE_ALLURE` | Enable Allure reporting | `1` |
| `WORKERS` | Number of parallel Playwright workers | Auto (CI: 1) |

### Local Setup

For local test execution, the framework uses a `.env` file at the project root and a dedicated kubeconfig file.

#### Kubeconfig Configuration

The framework attempts `oc login` first, falling back to OAuth token-based kubeconfig generation:

```bash
# Option 1 (automatic): oc login with dedicated kubeconfig
oc login --kubeconfig ./.kubeconfigs/test-config <cluster-url> -u <username> -p <password>

# Option 2 (fallback): OAuth token-based kubeconfig generation
# The framework generates a kubeconfig from an OAuth token if oc is not available
```

The kubeconfig file is created during global setup and cleaned up during teardown (unless `DEBUG=1`).

#### Environment Variables (.env file)

```bash
# OpenShift cluster credentials
OPENSHIFT_USERNAME=kubeadmin
OPENSHIFT_PASSWORD=your-password

# Cluster identification (used for URL construction)
CLUSTER_NAME=my-cluster
CLUSTER_DOMAIN=example.com

# Or explicit URL
WEB_CONSOLE_URL=https://console-openshift-console.apps.my-cluster.example.com/

# Debug mode
DEBUG=0
```

#### Environment Variable Behavior

**`localhost` (detected via URL):**
- If the web console URL is detected as localhost (e.g., `http://localhost:9000`), the framework will:
  - **Bypass UI login** - Skips the authentication flow
  - **Bypass storage state** - Does not generate or use saved authentication state
  - Assumes development mode where authentication is not required

**`DEBUG` variable:**
- If `DEBUG=1`:
  - Bypasses cleanup operations - Test resources and kubeconfig files are not deleted
  - Runs browser in headed mode
  - Disables Allure reporting
  - Useful for debugging and inspecting test artifacts
- If `DEBUG=0` or unset:
  - Normal cleanup operations run after test execution

---

<a id="authentication-methods"></a>
## 🔐 Authentication Methods

The framework supports dual login options for OpenShift console authentication:

### Supported Login Methods

1. **kube:admin Login** (Default)
   - Uses the `kube:admin` OAuth provider
   - Requires cluster admin credentials (`OPENSHIFT_USERNAME`/`OPENSHIFT_PASSWORD`)
   - Provides full cluster access for comprehensive testing

2. **test User Login**
   - Uses the `test` OAuth provider
   - Set `NON_PRIV=1` to use this method
   - Suitable for testing with limited permissions

### Authentication Flow

The framework automatically handles authentication during global setup:

1. **Kubeconfig Generation**: Authenticates via `oc login` (preferred) or OAuth token exchange (fallback)
2. **K8s Client Initialization**: Creates a Kubernetes client with the generated kubeconfig
3. **Test Namespace Creation**: Creates the test namespace on the cluster
4. **Browser Login**: Launches a browser, performs UI login, and saves storage state
5. **Storage State Persistence**: Tests reuse the saved authentication state, bypassing login for faster execution

### Login Method Selection

```typescript
// LoginPage supports both methods
await loginPage.clickKubeAdminLogin();  // Uses kube:admin provider
await loginPage.clickTestLogin();       // Uses test provider
```

### Environment-Specific Behavior

- **Remote Clusters**: Full authentication flow with storage state persistence
- **Localhost Development**: Authentication skipped (manual login assumed)
- **CI/CD Environments**: Uses configured credentials for automated testing

### Troubleshooting Authentication

If authentication fails:

1. **Verify Credentials**: Ensure `OPENSHIFT_USERNAME` and `OPENSHIFT_PASSWORD` are correct
2. **Check OAuth Providers**: Confirm the cluster has the expected OAuth providers enabled
3. **Storage State Issues**: Delete `.storage-states/` directory to force fresh login
4. **Network Connectivity**: Verify `WEB_CONSOLE_URL` or `CLUSTER_URL` is accessible
5. **oc CLI**: If `oc login` fails, the framework falls back to OAuth — ensure the cluster API is reachable

---

### Configuration Precedence

**Web Console URL Precedence:**
1. `WEB_CONSOLE_URL` (explicit, highest priority)
2. `BASE_URL` (explicit)
3. `BRIDGE_BASE_ADDRESS` (explicit)
4. Constructed from `CLUSTER_NAME` + `CLUSTER_DOMAIN`: `https://console-openshift-console.apps.{CLUSTER_NAME}.{CLUSTER_DOMAIN}/`
5. `http://localhost:9000` (default fallback)

**Cluster API URL Precedence:**
1. `CLUSTER_URL` (explicit, highest priority)
2. `OPENSHIFT_CLUSTER_URL` (explicit)
3. Constructed from `CLUSTER_NAME` + `CLUSTER_DOMAIN`: `https://api.{CLUSTER_NAME}.{CLUSTER_DOMAIN}:6443`
4. `https://api.cluster.local:6443` (default fallback)

**Password Precedence:**
1. `OPENSHIFT_PASSWORD` (explicit, highest priority)
2. `BRIDGE_KUBEADMIN_PASSWORD` (fallback)
3. `password` (default fallback)

---

<a id="documentation"></a>
## 📊 Test Execution Flow

```
1. Global Setup (global.setup.ts)
   └─> Authenticates with cluster (oc login or OAuth)
   └─> Initializes Kubernetes client
   └─> Creates test namespace
   └─> Saves shared configuration
   └─> Launches browser and performs UI login
   └─> Saves authenticated storage state

2. Test Execution (parallel workers)
   └─> Load configuration from file
   └─> Initialize step drivers and page objects
   └─> Execute test scenarios using saved storage state

3. Global Teardown (global.teardown.ts)
   └─> Clean up test namespace resources (unless DEBUG=1)
   └─> Delete kubeconfig file
   └─> Delete storage state file
   └─> Delete test configuration
   └─> Remove empty artifact directories
```

---

## 🎯 Best Practices

### 1. Use the Layer Architecture
- Tests only call StepDrivers
- StepDrivers use Page Objects and Clients directly
- Clients handle API interactions

### 2. Create Self-Contained Tests
- Each test creates its own resources with unique names
- Track resources for cleanup
- Resources are automatically cleaned up after test completion

### 3. Verify with Kubernetes API
- Create resources via Kubernetes API (faster than UI wizard)
- UI actions trigger state changes
- Kubernetes API verifies results

### 4. Follow Naming Conventions
- Test files: `*.spec.ts`
- StepDrivers: `*-step-driver.ts`
- Page objects: `*-page.ts`
- Clients: `*-client.ts`

### 5. Keep Tests Independent
- Each test should be runnable in isolation
- Use `beforeEach` for common setup (navigation, modals)
- Context manager handles state with type-safe ContextKey enum

### 6. Use Allure Annotations
- Add `withAllure({ suite, feature, tags })` at the start of each test
- Use descriptive suite and feature names for report organization
- Tag tests appropriately (`@tier1`, `@tier2`, `@gating`)

### 7. Use Type-Safe Context Keys
- Always use `ContextKey` enum instead of hard-coded strings
- Provides compile-time type safety and IntelliSense support
- Prevents typos and ensures consistency across the codebase

---

## 🐛 Troubleshooting

### Tests Fail to Connect to Cluster

Check environment variables:
```bash
echo $CLUSTER_URL
echo $OPENSHIFT_USERNAME
echo $WEB_CONSOLE_URL
```

### Browser Not Found

Install Playwright browsers:
```bash
npx playwright install chromium
```

### Timeout Issues

Increase timeout in `playwright.config.ts`:
```typescript
timeout: 600 * 1000  // 10 minutes
```

### Debug Test Failures

Use debug mode:
```bash
npm run test-playwright-debug -- tests/tier1/example/example.spec.ts
```

Or enable headed mode with `DEBUG=1`:
```bash
DEBUG=1 npm run test-playwright -- tests/tier1/example/example.spec.ts
```

---

## 🔧 Configuration Files

### playwright.config.ts

Main Playwright configuration:
- Browser settings (Chromium headless/headed)
- Test timeouts (480s default)
- Retry strategy (configurable via `PLAYWRIGHT_RETRIES`)
- Project setup/teardown (`global.setup.ts`, `global.teardown.ts`)
- Reporters: Allure (primary), List (console), JUnit (CI)

### tsconfig.json

TypeScript configuration:
- Path aliases (`@/` = `playwright/src/`)
- ES2020 target
- CommonJS modules

---

## 🤖 Cursor Agentic Workflow

This project uses a **multi-persona agentic workflow** powered by [Cursor](https://cursor.sh/) rules (`.cursor/rules/*.mdc`), custom commands (`.cursor/commands/*.md`), and Playwright MCP integration. The workflow accelerates test creation, maintenance, debugging, and documentation by routing tasks to specialized agent roles.

### Agent Personas

An **Orchestrator** (`orchestrator.mdc`, `alwaysApply: true`) routes every request to one or more specialized roles:

| Role | Rule file | Activation | Responsibilities |
|------|-----------|-----------|-----------------|
| **QA Architect** | `qa-architect.mdc` | On request | Framework design, component gap analysis, tier placement (gating/tier1/tier2), locator strategy, architectural policies (page encapsulation, UI-first navigation, test isolation). |
| **Business Analyst** | `business-analyst.mdc` | On request | Feature-to-scenario translation, acceptance criteria, STD document creation/maintenance, consolidation policy (append to existing STDs, never duplicate). |
| **Code Reviewer** | `code-reviewer.mdc` | `playwright/**/*.ts` | Pattern compliance audit, page encapsulation checks, locator strategy (inline vs property), lint/type-check enforcement, artifact cleanup. |
| **Automation Implementer** | `automation-implementer.mdc` | `playwright/**/*.ts` | Write tests, step drivers, page objects. Enforces UI-first navigation, namespace isolation, context-driven data flow. |
| **Infrastructure Handler** | `infrastructure-handler.mdc` | On request | Playwright config, environment variables, global setup/teardown rule engine, TestTimeouts. |
| **Test Executor** | `test-executor.mdc` | On request | Run tests, result analysis, failure classification, live browser debugging via Playwright MCP, development mode (`PLAYWRIGHT_RETRIES=0`). |
| **Git Handler** | `git-handler.mdc` | On request | Pre-commit artifact cleanup, squash commits into single commit, `.gitignore` maintenance. Never force-pushes or amends pushed commits. |
| **UI Explorer** | `ui-exploration.mdc` | On request | Explore live UI via Playwright MCP, discover untested features and `data-test` attributes, produce gap report. Optionally implement tests with `--implement`. |
| **Bug Hunter** | `bug-hunter.mdc` | On request | Replay test-mapped workflows via Playwright MCP to find visual, functional, and data issues. Read-only. |
| **Code Cleanup** | `code-cleanup.mdc` | On request | Systematic dead code removal — unused imports, dead methods, dead tests, code duplication, convention violations. Produces structured cleanup report. |

### Custom Commands

Custom commands (`.cursor/commands/`) provide structured workflows that chain agent personas. Tags must always be wrapped in single quotes (e.g., `'@gating'`).

| Command | File | Purpose | Example |
|---------|------|---------|---------|
| `/test-fix-cycle` | `test-fix-cycle.md` | Run a test suite, analyze failures, apply fixes or skips, iterate until stable. Uses MCP for live debugging. | `/test-fix-cycle '@tier1'` |
| `/health-check` | `health-check.md` | Read-only diagnostic run. Reports pass/fail/skip with failure classification. No code changes. | `/health-check '@tier1' --workers=4` |
| `/debug-test` | `debug-test.md` | Focused single-test debugging using Playwright MCP as primary tool. | `/debug-test TEMPLATE-001` |
| `/ui-exploration` | `ui-exploration.md` | Explore UI pages via Playwright MCP, identify untested features, produce gap report. Supports `--implement`. | `/ui-exploration projects --implement` |
| `/bug-hunt` | `bug-hunt.md` | Replay test-mapped workflows via MCP to find visual/functional issues. Read-only. | `/bug-hunt auth` |
| `/code-cleanup` | `code-cleanup.md` | Systematic cleanup — remove unused imports, dead methods, dead tests, fix conventions. | `/code-cleanup all` |
| `/commit-tests` | `commit-tests.md` | Clean up artifacts, squash all work into single commit, optionally push. | `/commit-tests --push` |

#### `/test-fix-cycle` — Stabilization Loop

Phases: Initial Run → Result Analysis → Fix Cycle (per failure) → Skip Policy → Validation Run → Summary.

Key rules:
- Always uses `PLAYWRIGHT_RETRIES=0` during the cycle
- Uses MCP browser tools to inspect live UI before guessing at selectors
- Fixes in the correct layer: selectors in page objects, logic in step drivers, assertions in tests
- Tests that cannot be fixed after 2 attempts are skipped with a descriptive reason

#### `/health-check` — Read-Only Diagnostic

Phases: Pre-flight → Execute Tests → Parse Results → Classify Failures → Report.

Key rules:
- **Read-only** — no code modifications, no skips, no fixes
- Produces a structured report with pass/fail/skip counts, failure classification, and recommendations

#### `/debug-test` — Focused Single-Test Debugging

Phases: Reproduce Failure → Diagnose with MCP (primary) / Scripts (fallback) → Apply Fix → Verify (3 consecutive passes).

Key rules:
- **MCP first** — uses Playwright MCP browser tools (snapshot, navigate, evaluate) as primary debugging method
- Targets a single test at a time
- Always uses `PLAYWRIGHT_RETRIES=0` for immediate feedback

#### `/code-cleanup` — Systematic Dead Code Removal

Phases: Static Analysis → Apply Fixes (dependency order: PO → SD → tests) → Validation (lint + type-check) → Cleanup Report.

Key rules:
- **Grep before delete** — always searches full codebase for references before removing code
- **Structural only** — does not change test logic, only removes dead code and fixes conventions

#### `/commit-tests` — Clean Commit with Artifact Cleanup

Phases: Branch Guard → Pre-Commit Cleanup → Lint → Review Changes → Squash Commit → Post-Commit Verification → Push (optional).

Key rules:
- Cleans up artifacts before staging
- Squashes all work into a single commit
- Derives commit message from the diff
- Never force-pushes or commits sensitive files

### Multi-Role Workflows

Complex tasks chain roles in sequence:

1. **New feature testing**: Business Analyst → QA Architect → Automation Implementer → Code Reviewer → Business Analyst (STD)
2. **Test maintenance**: Code Reviewer → Automation Implementer → Code Reviewer
3. **Coverage expansion**: Business Analyst → QA Architect → Automation Implementer → Business Analyst (STD)
4. **Test execution with auto-fix**: Test Executor → Automation Implementer → Test Executor
5. **Framework extension**: QA Architect → Automation Implementer → Code Reviewer
6. **Coverage discovery**: UI Explorer → Gap Report
7. **Focused debugging**: Test Executor → Automation Implementer → Test Executor (verify 3x)
8. **Clean commit**: Git Handler → optional push
9. **Bug hunting**: Bug Hunter → Bug Hunt Report
10. **Code cleanup**: Code Cleanup → optional Git Handler

### MCP Integration

The project uses the **Playwright MCP** server (configured in `.cursor/mcp.json`) for live browser interaction during test debugging and UI exploration.

#### Playwright MCP — Live Browser Interaction

Enables live browser inspection during test debugging. The Test Executor, UI Explorer, Bug Hunter, and Debug Test workflows use it to navigate the application under test, inspect element selectors, verify UI state, and diagnose test failures without running the full test suite.

Key tools: `browser_navigate`, `browser_snapshot` (accessibility tree), `browser_evaluate` (DOM inspection), `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`.

#### MCP Configuration

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

### Setup

To use the agentic workflow:

1. **Cursor IDE** — Open the project in [Cursor](https://cursor.sh/) (v0.48+).
2. **Rules** — The `.cursor/rules/` directory is committed to the repo; rules load automatically. The orchestrator rule (`alwaysApply: true`) activates on every session. Other rules activate when their `globs` pattern matches (e.g. `playwright/**/*.ts`) or when explicitly requested.
3. **Commands** — The `.cursor/commands/` directory contains custom command definitions. Invoke them in Cursor chat with `/command-name` followed by arguments.
4. **Playwright MCP** — Configured in `.cursor/mcp.json`. Cursor auto-starts it when MCP tools are invoked. Requires `npx` and `@playwright/mcp` (installed via npm).

### Key Conventions Enforced by Agents

| Convention | Enforced by |
|-----------|-------------|
| Layered architecture (spec → step drivers → page objects → clients) | Orchestrator, Code Reviewer, Automation Implementer |
| `withAllure(...)` with suite/feature/tags | Code Reviewer, Automation Implementer |
| Page encapsulation (`page` access only in page objects) | Code Reviewer, Automation Implementer |
| UI-first navigation, URL fallback only in page object methods | Automation Implementer |
| Inline locators for single-use, class properties for 2+ methods | Code Reviewer, Automation Implementer |
| STD consolidation (append to existing, never duplicate) | Business Analyst |
| Test ID traceability (`ID(TICKET-XXXXX)`) | Business Analyst, QA Architect |
| Rule engine for global setup/teardown | Infrastructure Handler |
| Development mode (`PLAYWRIGHT_RETRIES=0`) during fix cycles | Test Executor, Automation Implementer |

---

## 📖 Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [OpenShift Documentation](https://docs.openshift.com/container-platform/latest/welcome/index.html)
- [Kubernetes Client for Node.js](https://github.com/kubernetes-client/javascript)

---

## 🤝 Contributing

When adding tests for your console plugin:
1. Follow the existing architecture patterns (spec → step driver → page object → client)
2. Extend the `KubernetesClient` with handler modules for your API resources
3. Create page objects for each distinct page in your plugin
4. Create step drivers to compose page object and client calls with `test.step()` reporting
5. Write tests in `tests/` organized by tier
6. Verify via Kubernetes API when possible

---

**Node Version:** >= 18.x
**Playwright Version:** Check `package.json`
