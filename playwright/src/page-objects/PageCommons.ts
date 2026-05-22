import { expect, Page } from '@playwright/test';

import { ITEM_CREATE, NAV_TIMEOUT, SAVE_CHANGES, SECOND, SHORT_TIMEOUT } from '../utils/constants';
import { byTest, byTestId } from '../utils/locators';

const DROPDOWN_TEXT_FILTER = 'dropdown-text-filter';
const ITEM_FILTER = 'item-filter';
const NAME_FILTER_INPUT = 'name-filter-input';
const USER_DROPDOWN_TOGGLE = 'user-dropdown-toggle';

export class PageCommons {
  constructor(protected readonly page: Page) {}

  // ── Navigation ───────────────────────────────────────────────────────────────

  /** Navigate back via the first breadcrumb link. */
  async backToBreadcrumb() {
    await byTestId(this.page, 'breadcrumb-link-0').click();
  }

  // ── List interactions ────────────────────────────────────────────────────────

  /** Click the primary Create button. */
  async clickCreate() {
    await byTest(this.page, ITEM_CREATE).click();
  }

  /**
   * Click Create and land on the YAML editor.
   *
   * Some resources render a MenuToggle with "With YAML" / "With form" options.
   * Others use a plain button that navigates directly to the YAML editor.
   * This method handles both cases.
   */
  async createFromYAML() {
    await this.clickCreate();
    const withYAML = this.page.getByRole('menuitem', { name: 'With YAML' });
    if (await withYAML.isVisible({ timeout: 3 * SECOND }).catch(() => false)) {
      await withYAML.click();
    }
    await expect(this.page.getByText('name: example')).toBeVisible({ timeout: NAV_TIMEOUT });
  }

  /** Save the YAML editor form. */
  async save() {
    await byTest(this.page, SAVE_CHANGES).click();
  }

  // ── Filtering ────────────────────────────────────────────────────────────────

  /**
   * Fill the name filter input.
   * Plugin pages render data-test-id="item-filter"; the standard console SDK
   * renders data-test="name-filter-input". The combined selector handles both.
   */
  async filterByName(name: string, inputIndex = 0) {
    const input = this.page
      .locator(`[data-test="${NAME_FILTER_INPUT}"], [data-test-id="${ITEM_FILTER}"]`)
      .nth(inputIndex);
    await input.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    await input.fill(name);
  }

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  /** Click a tab by its visible name. */
  async openTab(name: string) {
    await this.page.getByRole('tab', { name }).click();
  }

  // ── Namespace / Project switching ────────────────────────────────────────────

  /**
   * Switch the active project/namespace using the OpenShift Console namespace-bar
   * dropdown. Clicks the toggle, types the project name to filter, then selects it.
   */
  async switchProject(ns: string) {
    await this.page.locator('.co-namespace-dropdown__menu-toggle').click();
    const searchInput = byTest(this.page, DROPDOWN_TEXT_FILTER);
    await searchInput.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    await searchInput.fill(ns);
    await this.page.getByRole('menuitem', { exact: true, name: ns }).click();
  }

  // ── Perspective switching ────────────────────────────────────────────────────

  async switchToPerspective(perspectiveName: string) {
    const toggle = byTestId(this.page, 'perspective-switcher-toggle');
    await toggle.waitFor({ state: 'visible', timeout: SHORT_TIMEOUT });
    await toggle.click();
    await this.page.getByRole('option').filter({ hasText: perspectiveName }).click();
  }

  async switchToAdministratorPerspective() {
    await this.switchToPerspective('Administrator');
  }

  // ── Assertions ────────────────────────────────────────────────────────────────

  async expectUserDropdownVisible(timeout = NAV_TIMEOUT) {
    await expect(byTest(this.page, USER_DROPDOWN_TOGGLE)).toBeVisible({ timeout });
  }

  async expectPageTitle(pattern: RegExp | string) {
    const title = await this.page.title();
    if (pattern instanceof RegExp) {
      expect(title).toMatch(pattern);
    } else {
      expect(title).toContain(pattern);
    }
  }

  async expectHeading(text: string, timeout = NAV_TIMEOUT) {
    await expect(this.page.getByRole('heading', { name: text })).toBeVisible({ timeout });
  }

  async expectRowVisible(name: string, timeout = NAV_TIMEOUT) {
    await expect(this.page.getByRole('row').filter({ hasText: name }).first()).toBeVisible({
      timeout,
    });
  }

  row(name: string) {
    return this.page.getByRole('row').filter({ hasText: name });
  }
}
