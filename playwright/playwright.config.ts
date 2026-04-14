import * as path from 'path';

import * as dotenv from 'dotenv';

const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import { defineConfig, devices } from '@playwright/test';

import { EnvVariables } from './src/utils/env-variables';
import { getStorageStatePath } from './src/utils/storage-state';
import { getTestResultsDir } from './src/utils/test-results-dir';

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

const repoRoot = path.resolve(__dirname, '..');
const testResultsDir = getTestResultsDir(repoRoot);

export default defineConfig({
  forbidOnly: EnvVariables.isCI,
  fullyParallel: true,
  globalSetup: path.resolve(__dirname, 'project-dependencies', 'global.setup.ts'),
  globalTeardown: path.resolve(__dirname, 'project-dependencies', 'global.teardown.ts'),
  projects: [
    {
      name: 'E2E Tests',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: chromeArgs,
          headless: !EnvVariables.isDebugMode && !process.env.HEADED,
        },
      },
    },
  ],
  reporter: EnvVariables.isDebugMode
    ? [['list']]
    : [
        ['list'],
        [
          path.resolve(__dirname, 'src', 'utils', 'allure-no-stdout-reporter.ts'),
          {
            detail: true,
            resultsDir: testResultsDir,
            suiteTitle: true,
          },
        ],
        ['junit', { outputFile: path.resolve(__dirname, '..', 'junit-results', 'junit.xml') }],
      ],
  retries: EnvVariables.retries,
  expect: {
    timeout: 30 * 1000,
  },
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  outputDir: testResultsDir,
  timeout: 480 * 1000,
  use: {
    baseURL: EnvVariables.webConsoleUrl,
    storageState: getStorageStatePath(__dirname),
    screenshot: 'off',
    trace: 'off',
    video: 'off',
    actionTimeout: 60 * 1000,
    navigationTimeout: 90 * 1000,
    ignoreHTTPSErrors: true,
    launchOptions: {
      slowMo: 0,
    },
  },
  workers: (() => {
    if (process.env.WORKERS) return parseInt(process.env.WORKERS, 10);
    if (EnvVariables.isCI) return 1;
    return undefined;
  })(),
});
