import LoginPage from '@/page-objects/login-page';
import { EnvVariables } from '@/utils/env-variables';
import { Page } from '@playwright/test';

import BasePageStepDriver from './base-page-step-driver';

export default class LoginStepDriver extends BasePageStepDriver<LoginPage> {
  constructor(page: Page) {
    super(page, LoginPage);
  }

  async navigateToLogin() {
    return await this.step('Navigate to login', async () => {
      await this.pageObject.navigateToLogin();
    });
  }

  async clickKubeAdminLogin() {
    return await this.step('Click kube:admin login', async () => {
      await this.pageObject.clickKubeAdminLogin();
    });
  }

  async fillAndSubmitLoginForm() {
    return await this.step('Login with stored credentials', async () => {
      const username = this.getStoreKeyVal<string>('username') ?? EnvVariables.username;
      const password = this.getStoreKeyVal<string>('password') ?? EnvVariables.password;
      await this.pageObject.fillAndSubmitLoginForm(username, password);
    });
  }

  async performKubeAdminLogin() {
    return await this.step('Perform kube:admin login', async () => {
      await this.pageObject.navigateToLogin();
      const isAdminLoginVisible = await this.pageObject.isKubeAdminButtonVisible();
      if (!isAdminLoginVisible)
        throw new Error('The "kube:admin" login button did not become visible.');
      await this.pageObject.clickKubeAdminLogin();
      const username = this.getStoreKeyVal<string>('username') ?? EnvVariables.username;
      const password = this.getStoreKeyVal<string>('password') ?? EnvVariables.password;
      await this.pageObject.fillAndSubmitLoginForm(username, password);
    });
  }

  async performLogout() {
    return await this.step('Perform logout', async () => {
      await this.pageObject.performLogout();
    });
  }
}
