import PageCommons from '@/page-objects/page-commons';
import { Page } from '@playwright/test';

import BasePageStepDriver from './base-page-step-driver';

export default class PageCommonsStepDriver extends BasePageStepDriver<PageCommons> {
  constructor(page: Page) {
    super(page, PageCommons);
  }

  async verifyAuthenticated() {
    return await this.step('Verify user is authenticated', async () => {
      return await this.pageObject.isAuthenticated();
    });
  }

  async verifyUserDropdownVisible() {
    return await this.step('Verify user dropdown is visible', async () => {
      return await this.pageObject.isUserDropdownVisible();
    });
  }

  async verifyPerspectiveSwitcherVisible() {
    return await this.step('Verify perspective switcher is visible', async () => {
      return await this.pageObject.isPerspectiveSwitcherVisible();
    });
  }

  async verifyPageTitle(expectedPattern: RegExp) {
    return await this.step(`Verify page title matches ${expectedPattern}`, async () => {
      const title = await this.pageObject.getPageTitle();
      return expectedPattern.test(title);
    });
  }

  async verifyTitle(titleText: string) {
    return await this.step(`Verify title "${titleText}" is visible`, async () => {
      return await this.pageObject.verifyTitle(titleText);
    });
  }

  async switchProject(projectName: string) {
    return await this.step(`Switch to project ${projectName}`, async () => {
      await this.pageObject.switchProject(projectName);
    });
  }

  async switchToPerspective(perspectiveName: string) {
    return await this.step(`Switch to ${perspectiveName} perspective`, async () => {
      await this.pageObject.switchToPerspective(perspectiveName);
    });
  }

  async clickDeleteButton() {
    return await this.step('Click delete button', async () => {
      await this.pageObject.clickDeleteButton();
    });
  }

  async clickSave() {
    return await this.step('Click save', async () => {
      await this.pageObject.clickSave();
    });
  }

  async clickCreate() {
    return await this.step('Click create', async () => {
      await this.pageObject.clickCreate();
    });
  }

  async filterByName(name: string) {
    return await this.step(`Filter by name "${name}"`, async () => {
      await this.pageObject.filterByName(name);
    });
  }

  async verifyRowExists(name: string) {
    return await this.step(`Verify row "${name}" exists`, async () => {
      return await this.pageObject.verifyRowExists(name);
    });
  }

  async clickActionsDropdown() {
    return await this.step('Click actions dropdown', async () => {
      await this.pageObject.clickActionsDropdown();
    });
  }
}
