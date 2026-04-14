import { TestTimeouts } from '@/utils/test-config';
import { waitForCondition } from '@/utils/wait-helpers';
import { Locator, Page } from '@playwright/test';

export default abstract class BasePage {
  constructor(public readonly page: Page) {}

  private readonly defaultRobustClickConfig = {
    timeout: TestTimeouts.CLUSTER_OPERATION,
    retries: 3,
    retryDelay: 1000,
    force: false,
    waitForState: 'visible' as const,
  };

  private readonly loadingIndicators = [
    '.pf-v6-c-spinner',
    '.pf-c-spinner',
    '.pf-v5-c-spinner',
    '[data-test="loading"]',
    '[data-test-id="loading-indicator"]',
    '.co-m-loader',
    '.loading-skeleton',
    '[class*="skeleton"]',
  ];

  protected async waitForLoadingComplete(timeout = TestTimeouts.UI_DELAY_MEDIUM): Promise<void> {
    const loadingSelector = this.loadingIndicators.join(', ');
    const loadingElements = this.page.locator(loadingSelector);
    try {
      const count = await loadingElements.count().catch(() => 0);
      if (count > 0) await loadingElements.first().waitFor({ state: 'hidden', timeout });
    } catch {
      /* continue */
    }
  }

  protected async goTo(url: string) {
    await this.page.goto(url, { timeout: TestTimeouts.NAVIGATION });
    await this.waitForLoadingComplete(TestTimeouts.UI_DELAY_MEDIUM);
  }

  protected locator(
    selectorText: string,
    options?: {
      has?: Locator;
      hasNot?: Locator;
      hasNotText?: RegExp | string;
      hasText?: RegExp | string;
    },
  ) {
    return this.page.locator(selectorText, options);
  }

  protected async robustClick(
    locator: Locator,
    options: {
      timeout?: number;
      retries?: number;
      retryDelay?: number;
      force?: boolean;
      waitForState?: 'visible' | 'attached' | 'detached' | 'hidden';
    } = {},
  ): Promise<void> {
    const config = { ...this.defaultRobustClickConfig, ...options };
    let lastError: Error | null = null;
    const attemptTimeout = config.timeout / config.retries;
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        await this.waitForLoadingComplete(Math.min(attemptTimeout / 4, 3000));
        await locator.waitFor({ state: config.waitForState, timeout: attemptTimeout });
        await locator.scrollIntoViewIfNeeded({ timeout: attemptTimeout / 3 });
        await this.page.waitForTimeout(TestTimeouts.UI_DELAY_MICRO);
        try {
          await locator.click({ force: config.force, timeout: attemptTimeout });
          return;
        } catch (clickError: any) {
          if (
            attempt < config.retries &&
            (clickError.message?.includes('intercept') ||
              clickError.message?.includes('not visible'))
          ) {
            await locator.click({ force: true, timeout: attemptTimeout });
            return;
          }
          throw clickError;
        }
      } catch (error: any) {
        lastError = error as Error;
        if (attempt < config.retries && config.retryDelay > 100)
          await this.page.waitForTimeout(config.retryDelay);
      }
    }
    throw new Error(`Robust click failed after ${config.retries} attempts: ${lastError?.message}`);
  }

  protected readonly _deleteConfirmationButton = this.locator(
    '[role="dialog"] button.pf-m-danger:has-text("Delete")',
  );

  protected async clickDeleteConfirmationButton(): Promise<void> {
    await this.robustClick(this._deleteConfirmationButton);
  }

  async verifyPageLoaded(
    indicatorSelectors: string[] = [],
    includeCreateButton = true,
    timeout = TestTimeouts.UI_VISIBILITY_QUICK,
  ): Promise<boolean> {
    try {
      await this.waitForLoadingComplete(Math.min(timeout / 2, TestTimeouts.UI_DELAY_MEDIUM));
      const createButton = this.locator('[data-test="item-create"]');
      let pageLoaded = includeCreateButton ? createButton : null;
      if (indicatorSelectors.length > 0) {
        const indicatorLocators = indicatorSelectors.map((s) => this.locator(s));
        if (pageLoaded) {
          for (const loc of indicatorLocators) pageLoaded = pageLoaded.or(loc);
        } else {
          let combined = indicatorLocators[0];
          for (let i = 1; i < indicatorLocators.length; i++) {
            combined = combined.or(indicatorLocators[i]);
          }
          pageLoaded = combined;
        }
      }
      if (!pageLoaded) pageLoaded = createButton;
      await pageLoaded.first().waitFor({ state: 'visible', timeout });
      return await pageLoaded
        .first()
        .isVisible()
        .catch(() => false);
    } catch {
      return false;
    }
  }

  async verifyTextVisible(
    text: string,
    useFirst = false,
    timeout: number = TestTimeouts.RESOURCE_CREATION,
  ): Promise<boolean> {
    try {
      await this.waitForLoadingComplete(Math.min(timeout / 4, 3000));
      let textLocator = this.page.getByText(text, { exact: false });
      if (useFirst) textLocator = textLocator.first();
      await textLocator.waitFor({ state: 'visible', timeout });
      return await textLocator.isVisible().catch(() => false);
    } catch {
      return false;
    }
  }

  async navigateToTab(
    tabLocator: Locator,
    timeout: number = TestTimeouts.RESOURCE_CREATION,
  ): Promise<void> {
    await this.waitForLoadingComplete(Math.min(timeout / 4, 3000));
    await tabLocator.waitFor({ state: 'visible', timeout });
    await this.robustClick(tabLocator);
    await this.waitForLoadingComplete(Math.min(timeout / 2, TestTimeouts.UI_DELAY_MEDIUM));
  }

  async clickButtonByText(buttonText: string): Promise<void> {
    const button = this.locator('button', { hasText: buttonText });
    await button.click();
  }

  async clickSave(): Promise<void> {
    const saveButton = this.locator('button').filter({ hasText: 'Save' });
    await this.robustClick(saveButton);
  }

  protected async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = TestTimeouts.DEFAULT,
    pollInterval: number = TestTimeouts.UI_DELAY_SHORT,
  ): Promise<boolean> {
    return await waitForCondition(condition, timeout, pollInterval);
  }
}
