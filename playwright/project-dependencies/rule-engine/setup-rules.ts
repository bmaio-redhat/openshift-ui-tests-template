import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import KubernetesClient from '@/clients/kubernetes-client';
import LoginPage from '@/page-objects/login-page';
import { EnvVariables } from '@/utils/env-variables';
import { logger } from '@/utils/logger';
import { type SharedTestConfig, MINUTE, SECOND, TestConfigManager } from '@/utils/test-config';
import { type Browser, type BrowserContext, type Page, chromium } from '@playwright/test';

import { SetupPhase, SetupRule } from './types';

export function getSetupRules(): SetupRule[] {
  let browserState: { browser: Browser; context: BrowserContext; page: Page } | null = null;

  return [
    {
      id: 'oc-login',
      name: 'Generate kubeconfig via oc login',
      phase: SetupPhase.AUTH,
      guard: (ctx) => !ctx.effectiveKubeConfigPath,
      onError: 'warn',
      run: async (ctx) => {
        const clusterUrl = EnvVariables.clusterUrl;
        if (!clusterUrl || clusterUrl === 'undefined')
          throw new Error('No cluster URL configured.');
        const kubeConfigDir = path.dirname(ctx.kubeConfigPath);
        if (!fs.existsSync(kubeConfigDir)) fs.mkdirSync(kubeConfigDir, { recursive: true });
        logger.info(`🔐 Authenticating to cluster: ${clusterUrl}`);
        execSync(
          `oc login "${clusterUrl}" -u "${EnvVariables.username}" -p "${EnvVariables.password}" --insecure-skip-tls-verify --kubeconfig="${ctx.kubeConfigPath}"`,
          { encoding: 'utf8', timeout: MINUTE, stdio: 'pipe' },
        );
        ctx.effectiveKubeConfigPath = ctx.kubeConfigPath;
        logger.success('✓ Kubeconfig generated via oc login');
      },
    },
    {
      id: 'oauth-login',
      name: 'Generate kubeconfig via OAuth',
      phase: SetupPhase.AUTH,
      guard: (ctx) => !ctx.effectiveKubeConfigPath,
      onError: 'throw',
      run: async (ctx) => {
        ctx.effectiveKubeConfigPath = await KubernetesClient.generateKubeconfig(
          EnvVariables.clusterUrl,
          EnvVariables.username,
          EnvVariables.password,
          ctx.kubeConfigPath,
        );
        logger.success('✓ Kubeconfig generated via OAuth authentication');
      },
    },
    {
      id: 'init-k8s-client',
      name: 'Initialize Kubernetes client',
      phase: SetupPhase.AUTH,
      onError: 'throw',
      run: async (ctx) => {
        if (!ctx.effectiveKubeConfigPath) throw new Error('No authentication method succeeded.');
        process.env.KUBECONFIG = ctx.effectiveKubeConfigPath;
        const k8sClient = new KubernetesClient(
          undefined,
          {
            baseUrl: EnvVariables.clusterUrl,
            username: EnvVariables.username,
            password: EnvVariables.password,
          },
          ctx.effectiveKubeConfigPath,
        );
        await k8sClient.verifyAuthentication();
        logger.success('✓ Cluster authentication verified');
        const token = k8sClient.getCurrentUserToken();
        if (token) {
          ctx.authToken = token;
          logger.success('✓ Authentication token extracted');
        }
        ctx.k8sClient = k8sClient;
      },
    },
    {
      id: 'setup-test-namespace',
      name: 'Set up test namespace',
      phase: SetupPhase.CLUSTER,
      onError: 'throw',
      run: async (ctx) => {
        if (!ctx.k8sClient) throw new Error('Kubernetes client not initialized');
        logger.info(`📦 Setting up test namespace: ${ctx.testNamespace}...`);
        await ctx.k8sClient.setupTestNamespace(ctx.testNamespace);
        logger.success(`✓ Test namespace ready: ${ctx.testNamespace}`);
      },
    },
    {
      id: 'save-config',
      name: 'Persist shared test configuration',
      phase: SetupPhase.CLUSTER,
      onError: 'throw',
      run: async (ctx) => {
        const setupConfig: SharedTestConfig = {
          authToken: ctx.authToken,
          kubeConfigPath: ctx.kubeConfigPath,
          projectName: ctx.testNamespace,
          testNamespace: ctx.testNamespace,
        };
        TestConfigManager.saveConfig(setupConfig);
        logger.info('✓ Saved test configuration');
      },
    },
    {
      id: 'browser-login',
      name: 'Launch browser and perform console login',
      phase: SetupPhase.BROWSER,
      onError: 'throw',
      run: async (ctx) => {
        const baseUrl = EnvVariables.webConsoleUrl;
        logger.info('🌐 Setting up browser state...');
        const browser = await chromium.launch({
          args: [
            '--ignore-certificate-errors',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        });
        const context = await browser.newContext({
          baseURL: baseUrl,
          ignoreHTTPSErrors: true,
          viewport: { width: 1920, height: 1080 },
        });
        const page = await context.newPage();
        browserState = { browser, context, page };
        if (!EnvVariables.isLocalhost) {
          const loginPage = new LoginPage(page);
          await loginPage.navigateToLogin(baseUrl);
          await page.waitForLoadState('load');
          if (!EnvVariables.isNonPrivUser) {
            const visible = await loginPage.isKubeAdminButtonVisible({ timeout: 10 * SECOND });
            if (visible) {
              await page.waitForTimeout(SECOND);
              await loginPage.clickKubeAdminLogin();
            }
          } else {
            const visible = await loginPage.isTestButtonVisible({ timeout: 10 * SECOND });
            if (visible) {
              await page.waitForTimeout(SECOND);
              await loginPage.clickTestLogin();
            }
          }
          await loginPage.fillAndSubmitLoginForm(
            EnvVariables.uiLoginUsername,
            EnvVariables.uiLoginPassword,
          );
          await page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
            timeout: 2 * MINUTE,
          });
          await page.waitForLoadState('load');
          logger.success(`✓ Login complete, redirected to: ${page.url()}`);
          await context.storageState({ path: ctx.storageStatePath });
          logger.success(`✓ Saved authenticated storage state`);
        } else {
          logger.info('🏠 Localhost detected, skipping login...');
        }
        try {
          const perspectiveDropdown = page.locator('[data-tour-id="tour-perspective-dropdown"]');
          const tourFooter = page.locator('[data-test="tour-step-footer-secondary"]');
          await Promise.race([
            perspectiveDropdown.waitFor({ state: 'visible', timeout: MINUTE }),
            tourFooter.waitFor({ state: 'visible', timeout: MINUTE }),
          ]).catch(() => undefined);
        } catch {
          /* continue */
        }
      },
    },
    {
      id: 'dismiss-welcome',
      name: 'Dismiss welcome modal',
      phase: SetupPhase.BROWSER,
      guard: () => !EnvVariables.ignoreWelcome,
      onError: 'warn',
      run: async () => {
        if (!browserState) throw new Error('Browser state not initialized');
        const { page } = browserState;
        try {
          const tourFooterSecondary = page.locator('[data-test="tour-step-footer-secondary"]');
          const footerVisible = await tourFooterSecondary
            .waitFor({ state: 'visible', timeout: 15 * SECOND })
            .then(() => true)
            .catch(() => false);
          if (footerVisible) {
            await tourFooterSecondary.click();
            logger.success('✓ Welcome modal dismissed');
          }
        } catch {
          /* continue */
        }
      },
    },
    {
      id: 'save-storage-state',
      name: 'Save storage state and close browser',
      phase: SetupPhase.BROWSER,
      onError: 'warn',
      run: async (ctx) => {
        if (browserState) {
          try {
            await browserState.context.storageState({ path: ctx.storageStatePath });
          } catch {
            /* non-fatal */
          }
          await browserState.context.close();
          await browserState.browser.close();
          browserState = null;
          logger.success('✓ Browser closed, storage state saved');
        }
      },
    },
  ];
}
