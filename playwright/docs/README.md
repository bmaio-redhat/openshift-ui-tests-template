# Playwright Test Documentation

This folder contains Software Test Descriptions (STDs) for the OpenShift UI Tests Playwright test suite. STDs map test cases to automation and provide step-by-step procedures for verification.

## Structure

| Path | Description |
|------|-------------|
| [`gating/`](#gating) | Gating smoke tests — no resource creation, < 2 min each. |
| [`tier1/`](#tier1) | Tier1 functional tests — CRUD workflows, resource creation, < 6 min each. |
| Root | STD template and general documentation. |

---

## Gating

Gating tests run as the `gating` Playwright project. Automation: `playwright/tests/gating/`.

| Document | Description |
|----------|-------------|
| _(add STDs here as gating specs are created)_ | |

---

## Tier1

Tier1 tests cover essential user workflows and feature areas. Automation: `playwright/tests/tier1/`.

| Document | Description |
|----------|-------------|
| [auth-and-navigation.md](tier1/auth-and-navigation.md) | Auth & Navigation: login, page title, user dropdown, perspective switching. |

---

## Other

| Document | Description |
|----------|-------------|
| [STD-TEMPLATE.md](STD-TEMPLATE.md) | Template for writing new STD documents. |

---

## STD Format

Each STD uses a consistent format:

1. **Project Overview** — Project name, feature area, related ticket IDs.
2. **Introduction** — Purpose and scope (in-scope / out-of-scope).
3. **Test Environment & Prerequisites** — Environment and preconditions.
4. **Test Case Definitions** — One or more test cases (`001`, `002`, …) with objective, preconditions (optional), and step / action / expected result tables.
5. **Requirements Traceability Matrix** — Mapping of ticket IDs to test case IDs and automation spec paths.

As the test suite grows, organize STDs by tier and feature area. Use an index document plus subfolders for areas with multiple STDs (e.g., `tier1/my-feature/overview.md`).
