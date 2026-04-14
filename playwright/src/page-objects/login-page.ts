import { Page } from '@playwright/test';

import BasePage from './base-page';

export default class LoginPage extends BasePage {
  private readonly _kubeAdminButton = this.locator('[title="Log in with kube:admin"]');
  private readonly _testButton = this.locator('[title="Log in with test"]');

  constructor(page: Page) {
    super(page);
  }

  async navigateToLogin(baseUrl?: string) {
    const isLocalhost = baseUrl
      ? /localhost|127\.0\.0\.1/.test(baseUrl)
      : this.page.url().includes('localhost') || this.page.url().includes('127.0.0.1');
    if (isLocalhost) await this.goTo('/');
    else await this.goTo('/auth/login');
  }

  async isAlreadyAuthenticated(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/(?!auth\/login|oauth)/, { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }

  async isKubeAdminButtonVisible(options?: { timeout?: number }): Promise<boolean> {
    try {
      await this._kubeAdminButton.waitFor({ state: 'visible', timeout: options?.timeout ?? 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async isTestButtonVisible(options?: { timeout?: number }): Promise<boolean> {
    try {
      await this._testButton.waitFor({ state: 'visible', timeout: options?.timeout ?? 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async clickKubeAdminLogin() {
    await this._kubeAdminButton.click();
  }
  async clickTestLogin() {
    await this._testButton.click();
  }

  async fillAndSubmitLoginForm(username: string, password: string) {
    await this.locator('[id="inputUsername"]').fill(username);
    await this.locator('[id="inputPassword"]').fill(password);
    await this.locator('[id="co-login-button"]').click();
  }

  async performLogout() {
    const loggedUser = this.locator(
      '[data-test="user-dropdown"], [data-test="username"], [data-test="user-dropdown-toggle"]',
    ).first();
    const logoutBtn = this.locator('[data-test="log-out"]');
    await loggedUser.waitFor({ state: 'visible', timeout: 30000 });
    await loggedUser.scrollIntoViewIfNeeded();
    try {
      await loggedUser.click({ timeout: 5000 });
    } catch {
      await loggedUser.dispatchEvent('click');
    }
    await logoutBtn.waitFor({ state: 'visible', timeout: 10000 });
    await logoutBtn.click();
  }
}
