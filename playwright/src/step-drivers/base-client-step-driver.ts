import BaseClient, { ClusterAuthConfig } from '@/clients/base-client';
import { TestConfigManager } from '@/utils/test-config';
import { Page } from '@playwright/test';

import BaseStepDriver from './base-step-driver';

export default abstract class BaseClientStepDriver<
  TClient extends BaseClient = BaseClient,
> extends BaseStepDriver {
  protected readonly client: TClient;
  constructor(
    page: Page,
    clientOrType?:
      | TClient
      | (new (
          playwrightPage: Page | undefined,
          authConfig: ClusterAuthConfig,
          ...args: any[]
        ) => TClient),
  ) {
    super(page);
    if (!clientOrType) return;
    if (clientOrType instanceof BaseClient) {
      this.client = clientOrType as TClient;
      return;
    }
    const clientType = clientOrType as new (
      playwrightPage: Page | undefined,
      authConfig: ClusterAuthConfig,
      ...args: any[]
    ) => TClient;
    const authConfig = this.getClusterAuthConfig();
    const testConfig = TestConfigManager.getConfig();
    const configWithToken = testConfig?.authToken
      ? { ...authConfig, token: testConfig.authToken }
      : authConfig;
    this.client = new clientType(page, configWithToken, testConfig?.kubeConfigPath);
  }
}
