/**
 * Test Fixture
 *
 * Extends Playwright's base test with page-object fixtures injected directly,
 * following the kubevirt-plugin fixture pattern.
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures';
 *
 * test('example', async ({ loginPage, pageCommons }) => {
 *   await loginPage.login();
 *   await pageCommons.expectUserDropdownVisible();
 * });
 * ```
 *
 * Adding new page objects:
 * 1. Import the class
 * 2. Add it to the `Fixtures` type
 * 3. Add a fixture entry in `test.extend`
 */

import { expect, test as base } from '@playwright/test';

import { LoginPage } from '../page-objects/LoginPage';
import { PageCommons } from '../page-objects/PageCommons';

type Fixtures = {
  loginPage: LoginPage;
  pageCommons: PageCommons;
  // Add new page objects here as the suite grows:
  // myFeaturePage: MyFeaturePage;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    const lp = new LoginPage(page);
    await lp.seedGuidedTourState();
    await use(lp);
  },

  pageCommons: async ({ page }, use) => {
    await use(new PageCommons(page));
  },

  // Add new fixtures here:
  // myFeaturePage: async ({ page }, use) => {
  //   await use(new MyFeaturePage(page));
  // },
});

export { expect };
