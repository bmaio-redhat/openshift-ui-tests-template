import * as fs from 'fs';
import * as path from 'path';

import { EnvVariables } from '@/utils/env-variables';
import { logger } from '@/utils/logger';
import { TestConfigManager } from '@/utils/test-config';

import { TeardownRule, TeardownScope } from './types';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export function getTeardownRules(): TeardownRule[] {
  return [
    {
      id: 'cleanup-namespace-resources',
      name: 'Clean up test namespace resources',
      scope: TeardownScope.NAMESPACE,
      onError: 'warn',
      run: async (ctx) => {
        if (!ctx.k8sClient) {
          logger.warn('No Kubernetes client — skipping cleanup');
          return;
        }
        logger.info(`Cleaning up resources in ${ctx.testNamespace}...`);
      },
    },
    {
      id: 'cleanup-kubeconfig',
      name: 'Delete kubeconfig file',
      scope: TeardownScope.FILES,
      onError: 'skip',
      guard: () => !EnvVariables.isDebugMode,
      run: async (ctx) => {
        if (ctx.kubeConfigPath && fs.existsSync(ctx.kubeConfigPath)) {
          fs.unlinkSync(ctx.kubeConfigPath);
          logger.info(`✓ Deleted kubeconfig: ${ctx.kubeConfigPath}`);
        }
      },
    },
    {
      id: 'cleanup-storage-state',
      name: 'Delete storage state file',
      scope: TeardownScope.FILES,
      onError: 'skip',
      run: async () => {
        const storageStatePath = path.join(PROJECT_ROOT, '.storage-states', 'test-state.json');
        if (fs.existsSync(storageStatePath)) {
          fs.unlinkSync(storageStatePath);
          logger.info(`✓ Deleted storage state: ${storageStatePath}`);
        }
      },
    },
    {
      id: 'cleanup-test-config',
      name: 'Delete test config file',
      scope: TeardownScope.FILES,
      onError: 'skip',
      run: async () => {
        TestConfigManager.deleteConfig();
        logger.info('✓ Deleted test configuration');
      },
    },
    {
      id: 'cleanup-empty-dirs',
      name: 'Remove empty artifact directories',
      scope: TeardownScope.FILES,
      onError: 'skip',
      run: async () => {
        for (const dir of ['.kubeconfigs', '.test-configs', '.storage-states', '.test-data']) {
          const fullPath = path.join(PROJECT_ROOT, dir);
          if (fs.existsSync(fullPath)) {
            const files = fs.readdirSync(fullPath);
            if (files.length === 0) {
              fs.rmdirSync(fullPath);
              logger.info(`✓ Removed empty ${dir}/`);
            }
          }
        }
      },
    },
  ];
}
