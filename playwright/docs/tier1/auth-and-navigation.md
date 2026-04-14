# Software Test Description (STD): Auth & Navigation (Tier1)

## 1. Project Overview
*   **Project Name:** OpenShift UI Tests Template
*   **Feature Area:** Tier1 – Authentication & Console Navigation
*   **Related IDs:** [TEMPLATE-001](https://issues.redhat.com/browse/TEMPLATE-001)

## 2. Introduction
### 2.1 Purpose
Documents `playwright/tests/tier1/example/example.spec.ts`: verifies end-to-end console authentication (kube:admin login), post-login landing page state, perspective switching, basic page navigation, project listing, and logout flow.

### 2.2 Scope
*   **In-Scope:** kube:admin OAuth login, page title verification, user dropdown visibility, perspective switcher presence, Administrator perspective navigation, Projects page listing, test namespace visibility, logout redirect.
*   **Out-of-Scope:** Non-privileged (test) user login, Developer perspective flows, project creation/deletion, detailed resource page interactions.

### 2.3 Assertions
*   **Pattern:** Mix of `expect()` (hard assertions) for critical auth checks and `expect()` for navigation verifications.

## 3. Test Environment & Prerequisites
*   **Environment:** OpenShift cluster with kube:admin OAuth provider enabled.
*   **Describe:** `OpenShift Console - Auth & Navigation` — `tag: ['@tier1']`.
*   **Prerequisites:**
    *   Global setup has completed successfully (kubeconfig generated, test namespace created, storage state saved).
    *   The test namespace (`TEST_NS` / default `pw-test-ns`) exists on the cluster.
    *   The `kube:admin` OAuth identity provider is available on the login page.

## 4. Test Case Definitions

*Automation:* `tests/tier1/example/example.spec.ts`

### `001`: ID(TEMPLATE-001) Authenticate and verify console landing page

*   **Objective:** Verify that a user can authenticate with the OpenShift console via kube:admin, land on the expected page, switch perspectives, navigate to the Projects page, confirm the test namespace exists, and log out successfully.
*   **Pre-conditions:** Cluster is accessible, kube:admin credentials are configured in environment variables.

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| 1 | Navigate to `/auth/login`, click kube:admin IDP button, submit login form with configured credentials | Login form is submitted, page begins loading |
| 2 | Wait for page load to complete | URL no longer contains `/auth/login` |
| 3 | Read page title | Title matches `Red Hat OpenShift` (case-insensitive) |
| 4 | Locate user dropdown element (`[data-test="user-dropdown"]`) | User dropdown is visible within 30 seconds |
| 5 | Locate perspective switcher (`[data-tour-id="tour-perspective-dropdown"]`) | Perspective switcher is visible within 15 seconds |
| 6 | Open perspective dropdown, select "Administrator" | URL contains `/k8s/` indicating Administrator perspective |
| 7 | Navigate to `/k8s/cluster/projects`, wait for page load | Page heading displays "Projects" |
| 8 | Filter project list by test namespace name | Test namespace row is visible in the filtered list |
| 9 | Click user dropdown, click "Log out" | URL redirects to `/auth/login` or OAuth page within 30 seconds |

---

## 5. Requirements Traceability Matrix

| Requirement ID | Test Case ID | Automation (Spec) |
| :--- | :--- | :--- |
| TEMPLATE-001 | `001` | `tests/tier1/example/example.spec.ts` |

## 6. Approvals
*   **Prepared By:** QE Team
*   **Reviewed By:** —
*   **Approval Signature:** __________________
