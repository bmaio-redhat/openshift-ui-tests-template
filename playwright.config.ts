import * as path from 'path';

import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { defineConfig, devices } from '@playwright/test';

import { env } from './playwright/src/utils/env';

const chromeArgs = [
  '--ignore-certificate-errors',
  '--start-maximized',
  '--window-size=1920,1080',
  '--disable-dev-shm-usage',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-background-networking',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-popup-blocking',
  '--disable-sync',
  '--disable-translate',
  '--no-first-run',
  '--js-flags=--max-old-space-size=4096',
];

export default defineConfig({
  expect: { timeout: 60_000 },
  forbidOnly: !!process.env.CI,
  fullyParallel: false,
  outputDir: './playwright/test-results/artifacts',
  /**
   * Projects run in dependency order:
   *  1. setup  — logs in and saves auth state (single worker, must succeed before other projects)
   *  2. gating — smoke tests that run after setup completes
   *  3. tier1  — functional tests that run after setup completes
   */
  projects: [
    {
      fullyParallel: false,
      name: 'setup',
      testDir: './playwright/tests/setup',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: chromeArgs,
          headless: !process.env.DEBUG_MODE && !process.env.HEADED,
        },
        viewport: { height: 1080, width: 1920 },
      },
    },
    {
      dependencies: ['setup'],
      fullyParallel: true,
      name: 'gating',
      testDir: './playwright/tests/gating',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: chromeArgs,
          headless: !process.env.DEBUG_MODE && !process.env.HEADED,
        },
        storageState: 'playwright/.auth/session.json',
        viewport: { height: 1080, width: 1920 },
      },
    },
    {
      dependencies: ['setup'],
      fullyParallel: false,
      name: 'tier1',
      testDir: './playwright/tests/tier1',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: chromeArgs,
          headless: !process.env.DEBUG_MODE && !process.env.HEADED,
        },
        storageState: 'playwright/.auth/session.json',
        viewport: { height: 1080, width: 1920 },
      },
    },
  ],
  reporter: [
    ['list'],
    ['junit', { outputFile: './playwright/test-results/results.xml' }],
    ['html', { open: 'never', outputFolder: './playwright/test-results/html-report' }],
  ],
  retries: process.env.CI ? 1 : 0,
  timeout: 480 * 1000,
  use: {
    actionTimeout: 60_000,
    baseURL: env.baseURL,
    headless: !process.env.DEBUG_MODE && !process.env.HEADED,
    ignoreHTTPSErrors: true,
    navigationTimeout: 120_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: { height: 1080, width: 1920 },
  },
  workers: process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : 4,
});
