import { Locator, Page } from '@playwright/test';

import { TestTimeouts } from './test-config';

export async function waitForElementText(
  locator: Locator,
  expectedText: string,
  timeout: number = TestTimeouts.STATUS_VALIDATION,
): Promise<boolean> {
  try {
    await locator.filter({ hasText: expectedText }).first().waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    try {
      const allTexts = await locator.allTextContents();
      return allTexts.some((text) => text.includes(expectedText));
    } catch {
      return false;
    }
  }
}

export async function waitForElementStable(
  locator: Locator,
  timeout: number = TestTimeouts.UI_ELEMENT_VISIBILITY,
): Promise<void> {
  await locator.waitFor({ state: 'visible', timeout });
  const boundingBox1 = await locator.boundingBox().catch(() => null);
  await new Promise((resolve) => setTimeout(resolve, TestTimeouts.UI_DELAY_MICRO));
  const boundingBox2 = await locator.boundingBox().catch(() => null);
  if (
    boundingBox1 &&
    boundingBox2 &&
    (boundingBox1.x !== boundingBox2.x || boundingBox1.y !== boundingBox2.y)
  ) {
    await new Promise((resolve) => setTimeout(resolve, 2 * TestTimeouts.UI_DELAY_MICRO));
  }
}

export async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number = TestTimeouts.DEFAULT as number,
  pollInterval: number = TestTimeouts.UI_DELAY_SHORT as number,
): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      if (await condition()) return true;
    } catch {
      /* ignore */
    }
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
  return false;
}

export async function waitForNavigationComplete(
  page: Page,
  elementSelector: string,
  timeout: number = TestTimeouts.UI_ELEMENT_VISIBILITY,
): Promise<void> {
  await page.waitForSelector(elementSelector, { state: 'visible', timeout });
}
