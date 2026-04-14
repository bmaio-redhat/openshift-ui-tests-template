import PageCommons from '@/page-objects/page-commons';
import LoginStepDriver from '@/step-drivers/login-step-driver';
import { withAllure } from '@/utils/allure';
import { EnvVariables } from '@/utils/env-variables';
import test, { expect } from '@playwright/test';

test.describe('OpenShift Console - Auth & Navigation', () => {
  test('ID(TEMPLATE-001) Authenticate and verify console landing page @tier1', async ({ page }) => {
    await withAllure({ suite: 'Auth & Navigation', feature: 'Tier 1', tags: ['@tier1'] });

    const loginDriver = LoginStepDriver.Init(page);
    const commons = new PageCommons(page);

    await test.step('Perform login to OpenShift console', async () => {
      await loginDriver.performKubeAdminLogin();
      await page.waitForLoadState('load');
    });

    await test.step('Verify redirect away from login page', async () => {
      await expect(page).not.toHaveURL(/\/auth\/login/);
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
      const perspectiveDropdown = page.locator('[data-tour-id="tour-perspective-dropdown"]');
      await expect(perspectiveDropdown).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Switch to Administrator perspective', async () => {
      await commons.switchToAdministratorPerspective();
      const urlContains = await commons.waitForUrlContains('/k8s/', 15_000);
      expect(urlContains).toBeTruthy();
    });

    await test.step('Navigate to cluster Projects page', async () => {
      await page.goto('/k8s/cluster/projects');
      await page.waitForLoadState('load');
      const titleVisible = await commons.verifyTitle('Projects');
      expect(titleVisible).toBeTruthy();
    });

    await test.step('Verify test namespace exists in project list', async () => {
      const testNs = EnvVariables.testNamespace;
      await commons.filterByName(testNs);
      const rowVisible = await commons.verifyRowExists(testNs, 15_000);
      expect(rowVisible).toBeTruthy();
    });

    await test.step('Perform logout', async () => {
      await loginDriver.performLogout();
      await expect(page).toHaveURL(/\/auth\/login|oauth/, { timeout: 30_000 });
    });
  });
});
