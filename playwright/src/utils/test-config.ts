import * as fs from 'fs';
import * as path from 'path';

import { EnvVariables } from './env-variables';

export interface SharedTestConfig {
  authToken?: string;
  kubeConfigPath?: string;
  projectName: string;
  testNamespace: string;
}

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

export const TestTimeouts = {
  CLUSTER_OPERATION: 100 * SECOND,
  NETWORK_DELAY: 667,
  RESOURCE_CREATION: MINUTE,
  UI_ELEMENT_VISIBILITY: 3 * MINUTE,
  STATUS_VALIDATION: MINUTE,
  UI_FILTER_APPLY: 6 * SECOND,
  UI_ACTION_COMPLETE: MINUTE,
  POLLING_INTERVAL: SECOND,
  DEFAULT: 30 * SECOND,
  UI_DELAY_SHORT: 500,
  UI_DELAY_MEDIUM: 5 * SECOND,
  UI_DELAY_LONG: 15 * SECOND,
  UI_DELAY_EXTRA: 3 * SECOND,
  NAVIGATION: 3 * MINUTE,
  SHORT_WAIT: 5 * SECOND,
  ELEMENT_WAIT: MINUTE,
  RETRY_DELAY: 2 * SECOND,
  UI_DELAY_MICRO: 100,
  UI_DELAY_TRANSITION: 300,
  UI_ANIMATION_DELAY: 500,
  UI_VISIBILITY_QUICK: 5 * SECOND,
  UI_STABILIZE: 2 * SECOND,
  NAVIGATION_SETTLE: SECOND,
} as const;

export class TestConfigManager {
  private static cachedConfig: null | SharedTestConfig = null;

  private static getConfigFilePath(): string {
    const configDir = path.join(process.cwd(), '.test-configs');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    return path.join(configDir, 'test-config.json');
  }

  static clearCache(): void {
    this.cachedConfig = null;
  }

  static deleteConfig(): void {
    const configFile = this.getConfigFilePath();
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
    }
    try {
      const configDir = path.dirname(configFile);
      if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir);
        if (files.length === 0) fs.rmdirSync(configDir);
      }
    } catch {
      /* ignore */
    }
    this.clearCache();
  }

  static getConfig(): SharedTestConfig {
    if (this.cachedConfig) return this.cachedConfig;
    const configFile = this.getConfigFilePath();
    if (fs.existsSync(configFile)) {
      try {
        const content = fs.readFileSync(configFile, 'utf-8');
        this.cachedConfig = JSON.parse(content) as SharedTestConfig;
        return this.cachedConfig;
      } catch {
        /* fallback */
      }
    }
    const testNamespace = EnvVariables.testNamespace;
    let kubeConfigPath = EnvVariables.kubeConfigPath;
    if (!kubeConfigPath) {
      const kubeConfigDir = path.join(process.cwd(), '.kubeconfigs');
      kubeConfigPath = path.join(kubeConfigDir, 'test-config');
      if (!fs.existsSync(kubeConfigPath)) kubeConfigPath = undefined;
    }
    this.cachedConfig = {
      kubeConfigPath,
      projectName: testNamespace,
      testNamespace,
    };
    return this.cachedConfig;
  }

  static getConfigValue<K extends keyof SharedTestConfig>(key: K): SharedTestConfig[K] {
    return this.getConfig()[key];
  }

  static saveConfig(config: SharedTestConfig): void {
    const configFile = this.getConfigFilePath();
    const configDir = path.dirname(configFile);
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
  }
}
