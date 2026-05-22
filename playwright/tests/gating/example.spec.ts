/**
 * Gating smoke test — verifies the console is reachable and authentication works.
 * Replace this file with real feature-specific gating specs.
 */
import { expect, test } from '../../src/fixtures';

test.describe('OpenShift Console — smoke', () => {
  test('ID(TEMPLATE-001) console is accessible and user is authenticated', async ({
    pageCommons,
  }) => {
    await pageCommons.expectUserDropdownVisible();
  });

  test('ID(TEMPLATE-002) console page title matches expected pattern', async ({ page }) => {
    const title = await page.title();
    expect(title).toMatch(/OpenShift|Red Hat/i);
  });
});
