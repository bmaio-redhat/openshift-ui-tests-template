/**
 * Scenario Test Fixture
 *
 * Extends Playwright's base test with dependency-injected fixtures:
 *
 * 1. **testConfig** (worker-scoped) — Shared test configuration loaded from
 *    the file created by global.setup.ts (namespace, auth token, kubeconfig).
 *
 * 2. **steps** (test-scoped) — Lazy-loaded StepDriver instances. Each driver
 *    is created on first access and cached for the test's lifetime.
 *    Add new step drivers to the `steps` type and proxy `switch` below.
 *
 * 3. **cleanup** (test-scoped) — Per-test resource tracker. Call `cleanup.track*()`
 *    for every K8s resource created during the test; resources are deleted
 *    automatically when the test ends (pass or fail).
 *
 * 4. **utils** (test-scoped) — Lazy-loaded access to utilities, constants,
 *    and helpers (withAllure, EnvVariables, TestTimeouts, etc.).
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '@/fixtures/scenario-test-fixture';
 *
 * test('example', async ({ steps, testConfig, cleanup, utils }) => {
 *   await utils.withAllure({ suite: 'Example', feature: 'Tier 1' });
 *   await steps.login.performKubeAdminLogin();
 *   // ...
 * });
 * ```
 *
 * Configuration flow:
 *   global.setup.ts → .test-configs/test-config.json → TestConfigManager
 *   → testConfig fixture (worker-scoped) → available to all tests and drivers
 */

import LoginStepDriver from '@/step-drivers/login-step-driver';
import PageCommonsStepDriver from '@/step-drivers/page-commons-step-driver';
import { EnvVariables } from '@/utils/env-variables';
import { SharedTestConfig, TestConfigManager } from '@/utils/test-config';
import { expect, test as base } from '@playwright/test';

import { CleanupFixture, createCleanupFixture } from './cleanup-fixture';
import { getTestUtils, TestUtilsType } from './test-utils';

type WorkerFixtures = {
  testConfig: SharedTestConfig;
};

type TestFixtures = {
  _autoAnnotations: void;
  cleanup: CleanupFixture;
  steps: {
    login: LoginStepDriver;
    pageCommons: PageCommonsStepDriver;
    // Add new step drivers here as the framework grows:
    // kubernetes: KubernetesStepDriver;
  };
  utils: TestUtilsType;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  testConfig: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const config = TestConfigManager.getConfig();
      await use(config);
    },
    { scope: 'worker' },
  ],

  // eslint-disable-next-line no-empty-pattern
  _autoAnnotations: [
    async ({}, use, testInfo) => {
      if (testInfo.titlePath[0]) {
        testInfo.annotations.push({
          type: 'suite',
          description: testInfo.titlePath[0],
        });
      }
      try {
        const { allure } = await import('allure-playwright');
        if (allure) {
          allure.label('userMode', EnvVariables.isNonPrivUser ? 'nonpriv' : 'priv');
        }
      } catch {
        // Allure not available
      }
      await use();
    },
    { auto: true },
  ],

  steps: async ({ page }, use) => {
    const cache: Record<string, unknown> = {};

    const proxy = new Proxy({} as TestFixtures['steps'], {
      get(_target, prop: string) {
        if (cache[prop]) return cache[prop];

        switch (prop) {
          case 'login':
            cache[prop] = LoginStepDriver.Init(page);
            break;
          case 'pageCommons':
            cache[prop] = PageCommonsStepDriver.Init(page);
            break;
          // Add new step drivers here:
          // case 'kubernetes':
          //   cache[prop] = KubernetesStepDriver.Init(page);
          //   break;
          default:
            return undefined;
        }

        return cache[prop];
      },
    });

    await use(proxy);
  },

  // eslint-disable-next-line no-empty-pattern
  utils: async ({}, use) => {
    await use(getTestUtils());
  },

  // eslint-disable-next-line no-empty-pattern
  cleanup: async ({}, use, testInfo) => {
    const testName = testInfo.titlePath.join(' > ');
    const fixture = createCleanupFixture(testName);

    try {
      await use(fixture);
    } finally {
      if (!fixture.shouldSkipCleanup() && fixture.count > 0) {
        try {
          await fixture.executeCleanup();
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error(`[Cleanup] Failed for ${testName}: ${msg}`);
        }
      }
    }
  },
});

export { expect };
export type { CleanupFixture } from './cleanup-fixture';
export type { TestUtilsType } from './test-utils';
