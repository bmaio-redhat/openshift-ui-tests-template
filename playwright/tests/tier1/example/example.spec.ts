import { expect, test } from '@/fixtures/scenario-test-fixture';

test.describe('OpenShift Console - Auth & Navigation', { tag: ['@tier1'] }, () => {
  test('ID(TEMPLATE-001) Authenticate and verify console landing page', async ({
    page,
    steps,
    utils,
  }) => {
    await utils.withAllure({ suite: 'Auth & Navigation', feature: 'Tier 1', tags: ['@tier1'] });

    await test.step('Ensure authenticated session', async () => {
      await steps.login.performKubeAdminLogin();
      await page.waitForLoadState('load');
    });

    await test.step('Verify authenticated state (not on login page)', async () => {
      await expect(page).not.toHaveURL(/\/(auth\/login|oauth\/authorize)/, { timeout: 15_000 });
    });

    await test.step('Verify console page title', async () => {
      await expect(page).toHaveTitle(/Red Hat OpenShift/i);
    });

    await test.step('Verify user dropdown is visible', async () => {
      const userDropdown = page
        .locator(
          '[data-test="user-dropdown"], [data-test="username"], [data-test="user-dropdown-toggle"]',
        )
        .first();
      await expect(userDropdown).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Verify perspective switcher is present', async () => {
      const perspectiveToggle = page.locator('[data-test-id="perspective-switcher-toggle"]');
      await expect(perspectiveToggle).toBeVisible({ timeout: 15_000 });
    });
  });
});
