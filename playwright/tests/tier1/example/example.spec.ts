import PageCommons from '@/page-objects/page-commons';
import LoginStepDriver from '@/step-drivers/login-step-driver';
import { withAllure } from '@/utils/allure';
import test, { expect } from '@playwright/test';

test.describe('OpenShift Console - Auth & Navigation', () => {
  test('ID(TEMPLATE-001) Authenticate and verify console landing page @tier1', async ({ page }) => {
    await withAllure({ suite: 'Auth & Navigation', feature: 'Tier 1', tags: ['@tier1'] });

    const loginDriver = LoginStepDriver.Init(page);
    const commons = new PageCommons(page);

    await test.step('Ensure authenticated session', async () => {
      await loginDriver.performKubeAdminLogin();
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

    await test.step('Switch to Core platform perspective', async () => {
      await commons.switchToCorePlatformPerspective();
      await page.waitForLoadState('load');
    });

    await test.step('Navigate to cluster Projects page', async () => {
      await page.goto('/k8s/cluster/projects');
      await page.waitForLoadState('load');
      const titleVisible = await commons.verifyTitle('Projects');
      expect(titleVisible).toBeTruthy();
    });

    await test.step('Verify projects table is populated', async () => {
      const table = page.locator('[data-test="data-view-table"]');
      await expect(table).toBeVisible({ timeout: 15_000 });
      const rows = table.locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 10_000 });
      expect(await rows.count()).toBeGreaterThan(0);
    });

    await test.step('Perform logout', async () => {
      await loginDriver.performLogout();
      await expect(page).toHaveURL(/\/(auth\/login|oauth)/, { timeout: 30_000 });
    });
  });
});
