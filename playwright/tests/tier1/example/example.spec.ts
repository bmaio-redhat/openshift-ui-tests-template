import { expect, test } from '@/fixtures/scenario-test-fixture';

test.describe('OpenShift Console - Auth & Navigation', { tag: ['@tier1'] }, () => {
  test('ID(TEMPLATE-001) Authenticate and verify console landing page', async ({
    steps,
    utils,
  }) => {
    await utils.withAllure({ suite: 'Auth & Navigation', feature: 'Tier 1', tags: ['@tier1'] });

    await test.step('Ensure authenticated session', async () => {
      await steps.login.performKubeAdminLogin();
    });

    await test.step('Verify authenticated state', async () => {
      const authenticated = await steps.pageCommons.verifyAuthenticated();
      expect(authenticated, 'User should not be on the login page').toBeTruthy();
    });

    await test.step('Verify console page title', async () => {
      const titleMatches = await steps.pageCommons.verifyPageTitle(/Red Hat OpenShift/i);
      expect(titleMatches, 'Page title should contain "Red Hat OpenShift"').toBeTruthy();
    });

    await test.step('Verify user dropdown is visible', async () => {
      const visible = await steps.pageCommons.verifyUserDropdownVisible();
      expect(visible, 'User dropdown should be visible').toBeTruthy();
    });

    await test.step('Verify perspective switcher is present', async () => {
      const visible = await steps.pageCommons.verifyPerspectiveSwitcherVisible();
      expect(visible, 'Perspective switcher should be visible').toBeTruthy();
    });
  });
});
