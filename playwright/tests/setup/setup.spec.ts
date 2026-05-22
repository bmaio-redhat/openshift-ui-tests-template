/**
 * Cluster Test Preparation — runs once before all other test projects.
 *
 * Logs in to the OpenShift console and saves the authenticated storage state
 * to `playwright/.auth/session.json`. All subsequent test projects reuse this
 * session via `storageState` in playwright.config.ts.
 */
import { test } from '../../src/fixtures';

test.describe('Setup', () => {
  test('configure cluster settings', async ({ loginPage, page }) => {
    await loginPage.login();
    await page.context().storageState({ path: 'playwright/.auth/session.json' });
  });
});
