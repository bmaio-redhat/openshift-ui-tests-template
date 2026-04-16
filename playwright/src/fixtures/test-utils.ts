import { ContextKey } from '@/context-managers/context-keys';
import ScenarioContextManager from '@/context-managers/scenario-context-manager';
import { withAllure } from '@/utils/allure';
import { EnvVariables } from '@/utils/env-variables';
import { TestTimeouts } from '@/utils/test-config';
import { waitForCondition } from '@/utils/wait-helpers';

export interface TestUtilsType {
  withAllure: typeof withAllure;
  EnvVariables: typeof EnvVariables;
  TestTimeouts: typeof TestTimeouts;
  waitForCondition: typeof waitForCondition;
  ScenarioContextManager: typeof ScenarioContextManager;
  ContextKey: typeof ContextKey;
}

const moduleCache: Record<string, unknown> = {};

function lazyLoad<T>(key: string, loader: () => T): T {
  if (!(key in moduleCache)) {
    moduleCache[key] = loader();
  }
  return moduleCache[key] as T;
}

export function getTestUtils(): TestUtilsType {
  return {
    get withAllure() {
      return lazyLoad('withAllure', () => withAllure);
    },
    get EnvVariables() {
      return lazyLoad('EnvVariables', () => EnvVariables);
    },
    get TestTimeouts() {
      return lazyLoad('TestTimeouts', () => TestTimeouts);
    },
    get waitForCondition() {
      return lazyLoad('waitForCondition', () => waitForCondition);
    },
    get ScenarioContextManager() {
      return lazyLoad('ScenarioContextManager', () => ScenarioContextManager);
    },
    get ContextKey() {
      return lazyLoad('ContextKey', () => ContextKey);
    },
  };
}
