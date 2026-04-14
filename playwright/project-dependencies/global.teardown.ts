import * as fs from 'fs';

import KubernetesClient from '@/clients/kubernetes-client';
import { EnvVariables } from '@/utils/env-variables';
import { logger } from '@/utils/logger';
import { TestConfigManager } from '@/utils/test-config';
import { FullConfig } from '@playwright/test';

import { getTeardownRules, RuleEngine, TeardownContext } from './rule-engine';

async function globalTeardown(_config: FullConfig) {
  if (process.env.SKIP_GLOBAL_TEARDOWN === 'true') {
    logger.info('⏭️ Skipping global teardown');
    return;
  }
  if (EnvVariables.isDebugMode) {
    logger.info('🐛 Debug mode - skipping cleanup');
    return;
  }
  logger.info('🧹 Cleaning up test environment...');
  let k8sClient: KubernetesClient | undefined;
  let kubeConfigPath: string | undefined;
  try {
    TestConfigManager.clearCache();
    const testConfig = TestConfigManager.getConfig();
    kubeConfigPath = testConfig.kubeConfigPath;
    if (kubeConfigPath && fs.existsSync(kubeConfigPath)) {
      process.env.KUBECONFIG = kubeConfigPath;
    }
    k8sClient = new KubernetesClient(
      undefined,
      {
        baseUrl: EnvVariables.clusterUrl,
        username: EnvVariables.username,
        password: EnvVariables.password,
        token: testConfig.authToken,
      },
      kubeConfigPath,
    );
    await k8sClient.verifyAuthentication();
  } catch (error) {
    logger.warn(`Could not initialize K8s client: ${error}`);
  }
  const ctx: TeardownContext = {
    testNamespace: EnvVariables.testNamespace,
    k8sClient,
    kubeConfigPath,
  };
  await new RuleEngine().runTeardown(getTeardownRules(), ctx);
  logger.info('🏁 Global teardown complete');
}
export default globalTeardown;
