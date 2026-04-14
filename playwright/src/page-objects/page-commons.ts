import { TestTimeouts } from '@/utils/test-config';
import { waitForCondition, waitForElementStable } from '@/utils/wait-helpers';
import { Page } from '@playwright/test';

import BasePage from './base-page';

export default class PageCommons extends BasePage {
  readonly _createButton = this.locator('[data-test="item-create"]');
  protected readonly _confirmActionButton = this.locator('[data-test="confirm-action"]');
  private readonly _modalTitle = this.locator('.pf-v5-c-modal-box__title, .pf-c-modal-box__title');
  readonly _saveChangesButton = this.locator('[data-test="save-changes"]');
  private readonly _welcomeModal = this.locator('#guided-tour-modal');
  private readonly _welcomeModalCloseButton = this.locator(
    '[id="guided-tour-modal"] button[aria-label="Close"]',
  );
  protected readonly _actionsDropdown = this.locator('[data-test="actions-dropdown"] button');
  protected readonly _row = this.locator('[data-test-rows="resource-row"]');
  readonly actionsButton = this.locator('button:has-text("Actions")');

  constructor(page: Page) {
    super(page);
  }

  async clickCancelInModal() {
    await this.locator('button:has-text("Cancel")').click();
  }
  async clickCancel() {
    await this.clickCancelInModal();
  }
  async clickConfirmInModal() {
    await this.locator('button:has-text("Confirm")').click();
  }
  async clickConfirm() {
    await this.clickConfirmInModal();
  }

  async clickConfirmAction(): Promise<void> {
    await this._confirmActionButton.waitFor({ state: 'visible', timeout: TestTimeouts.DEFAULT });
    await this.robustClick(this._confirmActionButton);
  }

  async waitForDataPropagation(ms = TestTimeouts.UI_DELAY_EXTRA): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async clickDeleteButton() {
    const deleteButton = this.locator('button:has-text("Delete")');
    await this.robustClick(deleteButton);
    await this.page.waitForTimeout(TestTimeouts.UI_DELAY_MEDIUM);
  }

  async clickOkInModal() {
    await this.locator('button:has-text("OK")').click();
  }

  async clickSave() {
    await this.robustClick(this.locator('button').filter({ hasText: 'Save' }));
  }

  async clickSaveChanges() {
    await this._saveChangesButton.click();
  }

  async clickCreate() {
    await this.robustClick(this._createButton);
  }

  async closeModal() {
    const closeButton = this.locator(
      '[aria-label="Close"], .pf-v5-c-modal-box__close, .pf-c-modal-box__close',
    );
    await this.robustClick(closeButton);
  }

  async closeWelcomeModal() {
    await this._welcomeModalCloseButton.waitFor({
      state: 'visible',
      timeout: TestTimeouts.UI_ELEMENT_VISIBILITY,
    });
    await this.robustClick(this._welcomeModalCloseButton);
  }

  async tryCloseWelcomeModal(): Promise<boolean> {
    try {
      await this._welcomeModal.waitFor({
        state: 'visible',
        timeout: TestTimeouts.UI_ELEMENT_VISIBILITY,
      });
      await this._welcomeModalCloseButton.waitFor({
        state: 'visible',
        timeout: TestTimeouts.UI_DELAY_SHORT,
      });
      await this.robustClick(this._welcomeModalCloseButton);
      await this._welcomeModal.waitFor({
        state: 'hidden',
        timeout: TestTimeouts.UI_ACTION_COMPLETE,
      });
      return true;
    } catch {
      return false;
    }
  }

  async fillYamlEditor(yamlContent: string) {
    await this.page.waitForSelector('.monaco-editor', {
      state: 'visible',
      timeout: TestTimeouts.UI_ELEMENT_VISIBILITY,
    });
    await this.page.waitForTimeout(TestTimeouts.UI_DELAY_SHORT);
    const success = await this.page.evaluate((content) => {
      try {
        const editors = (window as any).monaco?.editor?.getEditors();
        if (editors?.length > 0) {
          const m = editors[0].getModel();
          if (m) {
            editors[0].executeEdits('', [
              { forceMoveMarkers: true, range: m.getFullModelRange(), text: content },
            ]);
            return true;
          }
        }
      } catch {}
      return false;
    }, yamlContent);
    if (!success) {
      const yamlEditorTextarea = this.locator('.ocs-yaml-editor textarea');
      await yamlEditorTextarea.waitFor({
        state: 'attached',
        timeout: TestTimeouts.UI_DELAY_MEDIUM,
      });
      await yamlEditorTextarea.focus();
      await this.page.evaluate((content) => {
        const ta = document.querySelector('.ocs-yaml-editor textarea') as HTMLTextAreaElement;
        if (ta) {
          ta.value = content;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, yamlContent);
    }
  }

  async getModalTitle(): Promise<string> {
    return (await this._modalTitle.textContent()) || '';
  }

  async isModalVisible(): Promise<boolean> {
    try {
      await this._modalTitle.waitFor({ state: 'visible', timeout: TestTimeouts.UI_DELAY_MEDIUM });
      return true;
    } catch {
      return false;
    }
  }

  async openPerspectiveDropdown(): Promise<void> {
    const perspectiveDropdown = this.locator('[data-tour-id="tour-perspective-dropdown"]');
    await perspectiveDropdown.waitFor({
      state: 'visible',
      timeout: TestTimeouts.UI_VISIBILITY_QUICK,
    });
    await this.robustClick(perspectiveDropdown);
  }

  async switchToPerspective(perspectiveName: string): Promise<void> {
    await this.openPerspectiveDropdown();
    const option = this.locator('[data-test-id="perspective-switcher-menu-option"]').filter({
      hasText: perspectiveName,
    });
    await option.waitFor({ state: 'visible', timeout: TestTimeouts.UI_VISIBILITY_QUICK });
    await this.robustClick(option);
  }

  async switchToAdministratorPerspective(): Promise<void> {
    await this.switchToPerspective('Administrator');
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
  }

  async reloadPage(timeout = 60000): Promise<void> {
    try {
      await this.page.reload({ waitUntil: 'load', timeout });
    } catch {
      /* continue */
    }
    await this.page.waitForLoadState('networkidle');
  }

  async switchProject(projectName: string) {
    const namespaceDropdown = this.locator('[data-test-id="namespace-bar-dropdown"]').locator(
      'button',
    );
    const isPresent = await namespaceDropdown
      .isVisible({ timeout: TestTimeouts.UI_DELAY_MEDIUM })
      .catch(() => false);
    if (!isPresent) return;
    const ns = await namespaceDropdown.textContent();
    if (ns?.includes(projectName)) return;
    const projectItem = this.locator('[data-test="dropdown-menu-item-link"]', {
      hasText: projectName,
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await namespaceDropdown.click({ timeout: TestTimeouts.UI_DELAY_EXTRA });
      } catch {
        await namespaceDropdown.dispatchEvent('click');
      }
      try {
        const searchFilter = this.locator('[data-test="dropdown-text-filter"]');
        await searchFilter.waitFor({ state: 'visible', timeout: TestTimeouts.UI_DELAY_EXTRA });
        await searchFilter.clear();
        await searchFilter.pressSequentially(projectName, { delay: 80 });
        await this.page.waitForTimeout(TestTimeouts.RETRY_DELAY);
        await projectItem.waitFor({ state: 'visible', timeout: TestTimeouts.UI_VISIBILITY_QUICK });
        await projectItem.click({ timeout: TestTimeouts.UI_DELAY_MEDIUM });
        await waitForElementStable(
          this.locator('[data-test-id="namespace-bar-dropdown"]'),
          TestTimeouts.UI_ACTION_COMPLETE,
        );
        return;
      } catch {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(TestTimeouts.UI_DELAY_SHORT);
      }
    }
  }

  async navigateToRoot() {
    await this.goTo('/');
    await this.waitForPageLoad();
  }

  async filterByName(name: string) {
    const itemFilter = this.locator('[data-test-id="item-filter"]');
    await itemFilter.clear();
    await itemFilter.fill(name);
    await itemFilter.press('Tab');
    await this.page.waitForTimeout(TestTimeouts.UI_VISIBILITY_QUICK);
  }

  async verifyRowExists(name: string, timeout: number = TestTimeouts.DEFAULT) {
    try {
      const row = this._row.filter({ hasText: name });
      await row.waitFor({ state: 'visible', timeout });
      return await row.isVisible();
    } catch {
      return false;
    }
  }

  async verifyTitle(titleText: string): Promise<boolean> {
    try {
      const t = this.locator('h1').filter({ hasText: titleText });
      await t.waitFor({ state: 'visible', timeout: TestTimeouts.UI_ELEMENT_VISIBILITY });
      return await t.isVisible();
    } catch {
      return false;
    }
  }

  async waitForUrlContains(
    urlString: string,
    timeout: number = TestTimeouts.NAVIGATION,
  ): Promise<boolean> {
    return await waitForCondition(
      async () => this.page.url().includes(urlString),
      timeout,
      TestTimeouts.POLLING_INTERVAL,
    );
  }

  async clickBreadcrumbItem(text: string) {
    const breadcrumb = this.locator('[aria-label="Breadcrumb"]').filter({ hasText: text });
    await this.robustClick(breadcrumb.locator('a').first());
  }

  async clickActionsDropdown() {
    await this.robustClick(this._actionsDropdown);
  }
  async clickActionButton() {
    await this.robustClick(this.actionsButton);
  }

  async clickKebabButton() {
    const kebabButton = this.locator('[data-test="kebab-button"]');
    await kebabButton.waitFor({ state: 'visible', timeout: TestTimeouts.UI_ACTION_COMPLETE });
    await this.robustClick(kebabButton);
  }
}
