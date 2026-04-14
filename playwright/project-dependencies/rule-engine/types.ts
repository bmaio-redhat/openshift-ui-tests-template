import type KubernetesClient from '@/clients/kubernetes-client';
import { logger } from '@/utils/logger';

export enum SetupPhase {
  AUTH = 'AUTH',
  CLUSTER = 'CLUSTER',
  BROWSER = 'BROWSER',
  REPORTING = 'REPORTING',
}

export enum TeardownScope {
  NAMESPACE = 'NAMESPACE',
  CLUSTER = 'CLUSTER',
  FILES = 'FILES',
}

const SETUP_PHASE_ORDER: SetupPhase[] = [
  SetupPhase.AUTH,
  SetupPhase.CLUSTER,
  SetupPhase.BROWSER,
  SetupPhase.REPORTING,
];
const TEARDOWN_SCOPE_ORDER: TeardownScope[] = [
  TeardownScope.NAMESPACE,
  TeardownScope.CLUSTER,
  TeardownScope.FILES,
];

export interface SetupContext {
  kubeConfigPath: string;
  storageStatePath: string;
  testNamespace: string;
  k8sClient?: KubernetesClient;
  effectiveKubeConfigPath?: string;
  authToken?: string;
  projectRoot: string;
}

export interface TeardownContext {
  testNamespace: string;
  k8sClient?: KubernetesClient;
  kubeConfigPath?: string;
}

export type SetupOnError = 'throw' | 'warn' | 'skip';
export type TeardownOnError = 'warn' | 'skip';

export interface SetupRule {
  id: string;
  name: string;
  phase: SetupPhase;
  run: (ctx: SetupContext) => Promise<void>;
  guard?: (ctx: SetupContext) => boolean;
  onError: SetupOnError;
}

export interface TeardownRule {
  id: string;
  name: string;
  scope: TeardownScope;
  run: (ctx: TeardownContext) => Promise<void>;
  guard?: (ctx: TeardownContext) => boolean;
  onError: TeardownOnError;
}

export class RuleEngine {
  async runSetup(rules: SetupRule[], ctx: SetupContext): Promise<void> {
    for (const phase of SETUP_PHASE_ORDER) {
      const phaseRules = rules.filter((r) => r.phase === phase);
      for (const rule of phaseRules) {
        if (rule.guard && !rule.guard(ctx)) {
          logger.info(`⏭️ Skipped: [${rule.id}] ${rule.name}`);
          continue;
        }
        try {
          await rule.run(ctx);
          logger.success(`[${rule.id}] ${rule.name}`);
        } catch (err) {
          const detail = `[${rule.id}] ${rule.name}: ${
            err instanceof Error ? err.message : String(err)
          }`;
          if (rule.onError === 'throw') {
            logger.error(`❌ ${detail}`);
            throw err;
          }
          if (rule.onError === 'warn') {
            logger.warn(detail);
            continue;
          }
          logger.info(`⏭️ ${detail}`);
        }
      }
    }
  }

  async runTeardown(rules: TeardownRule[], ctx: TeardownContext): Promise<void> {
    for (const scope of TEARDOWN_SCOPE_ORDER) {
      const scopeRules = rules.filter((r) => r.scope === scope);
      for (const rule of scopeRules) {
        if (rule.guard && !rule.guard(ctx)) {
          logger.info(`⏭️ Skipped: [${rule.id}] ${rule.name}`);
          continue;
        }
        try {
          await rule.run(ctx);
          logger.success(`[${rule.id}] ${rule.name}`);
        } catch (err) {
          const detail = `[${rule.id}] ${rule.name}: ${
            err instanceof Error ? err.message : String(err)
          }`;
          if (rule.onError === 'warn') logger.warn(detail);
          else logger.info(`⏭️ ${detail}`);
        }
      }
    }
  }
}
