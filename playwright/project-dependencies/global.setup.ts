import * as fs from 'fs';
import * as path from 'path';

import { EnvVariables } from '@/utils/env-variables';
import { logger } from '@/utils/logger';
import { FullConfig } from '@playwright/test';

import { getSetupRules, RuleEngine, SetupContext } from './rule-engine';

async function globalSetup(_config: FullConfig) {
  if (process.env.SKIP_GLOBAL_SETUP === 'true') {
    logger.info('⏭️ Skipping global setup');
    return;
  }
  logger.info('🚀 Setting up test environment...');
  const testNamespace = EnvVariables.testNamespace;
  const projectRoot = path.resolve(__dirname, '..', '..');
  const kubeConfigDir = path.resolve(projectRoot, '.kubeconfigs');
  const kubeConfigPath = path.join(kubeConfigDir, 'test-config');
  const storageStateDir = path.resolve(projectRoot, '.storage-states');
  const storageStatePath = path.join(storageStateDir, 'test-state.json');
  for (const dir of [kubeConfigDir, storageStateDir]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const ctx: SetupContext = { kubeConfigPath, storageStatePath, testNamespace, projectRoot };
  const engine = new RuleEngine();
  try {
    await engine.runSetup(getSetupRules(), ctx);
    logger.success('Test environment setup complete');
    logger.info(`   - Test Namespace: ${ctx.testNamespace}`);
    logger.info(`   - Auth Token: ${ctx.authToken ? 'Available ✓' : 'Not available'}`);
  } catch (error) {
    logger.error(`❌ Setup failed: ${error}`);
    throw error;
  }
}
export default globalSetup;
