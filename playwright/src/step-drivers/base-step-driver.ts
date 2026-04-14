import BaseClient, { ClusterAuthConfig } from '@/clients/base-client';
import { ContextKey, ContextValueType } from '@/context-managers/context-keys';
import ScenarioContextManager from '@/context-managers/scenario-context-manager';
import BasePage from '@/page-objects/base-page';
import { EnvVariables } from '@/utils/env-variables';
import { TestConfigManager, TestTimeouts } from '@/utils/test-config';
import test, { Page, Route } from '@playwright/test';

export { ContextKey };

interface StepDriverConstructor<T> {
  new (page: Page): T;
}

export default abstract class BaseStepDriver {
  constructor(public readonly page: Page) {
    this.initializeContextFromConfig();
  }

  static Init<T extends BaseStepDriver>(this: StepDriverConstructor<T>, page: Page): T {
    return new this(page);
  }

  private initializeContextFromConfig(): void {
    const config = TestConfigManager.getConfig();
    const contextManager = ScenarioContextManager.getInstance();
    if (!contextManager.get(ContextKey.CONFIG_TEST_NAMESPACE))
      contextManager.set(ContextKey.CONFIG_TEST_NAMESPACE, config.testNamespace);
    if (!contextManager.get(ContextKey.CONFIG_PROJECT_NAME))
      contextManager.set(ContextKey.CONFIG_PROJECT_NAME, config.projectName);
  }

  protected async step<T>(description: string, fn: () => Promise<T>): Promise<T> {
    return await test.step(description, fn);
  }

  protected getStoreKeyVal<K extends ContextKey>(key: K): ContextValueType<K> | undefined;
  protected getStoreKeyVal<T>(key: string): T | undefined;
  protected getStoreKeyVal<T>(key: string): T | undefined {
    return ScenarioContextManager.getInstance().get<T>(key);
  }

  protected setStoreKeyVal<K extends ContextKey>(key: K, value: ContextValueType<K>): this;
  protected setStoreKeyVal<T>(key: string, value: T): this;
  protected setStoreKeyVal<T>(key: string, value: T): this {
    ScenarioContextManager.getInstance().set<T>(key, value);
    return this;
  }

  protected overwriteStoreKeyVal<K extends ContextKey>(key: K, value: ContextValueType<K>): this;
  protected overwriteStoreKeyVal<T>(key: string, value: T): this;
  protected overwriteStoreKeyVal<T>(key: string, value: T): this {
    ScenarioContextManager.getInstance().overwrite<T>(key, value);
    return this;
  }

  protected getClusterAuthConfig(): ClusterAuthConfig {
    return {
      baseUrl: EnvVariables.clusterUrl,
      password: EnvVariables.password,
      username: EnvVariables.username,
    };
  }

  protected withClient<T extends BaseClient>(
    clientType: new (page: Page | undefined, config: ClusterAuthConfig, ...args: any[]) => T,
    authConfig?: ClusterAuthConfig,
  ): T {
    return new clientType(this.page, authConfig || this.getClusterAuthConfig());
  }

  protected withPage<T extends BasePage>(pageType: new (page: Page) => T): T {
    return new pageType(this.page);
  }

  async waitForNetworkResponse(
    endpointPattern: string,
    expectedStatusCode: number,
    timeout: number = TestTimeouts.DEFAULT,
    expectedMethod?: string,
  ): Promise<void> {
    const regexPattern = endpointPattern.replace(/\*/g, '.*').replace(/\?/g, '.');
    const urlRegex = new RegExp(regexPattern);
    await this.page.route(urlRegex, (route: Route) => {
      route.continue();
    });
    await this.page.waitForResponse(
      (response) => {
        return (
          urlRegex.test(response.url()) &&
          response.status() === expectedStatusCode &&
          (!expectedMethod || response.request().method() === expectedMethod)
        );
      },
      { timeout },
    );
  }
}
