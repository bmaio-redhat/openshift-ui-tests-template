import KubernetesClient from '@/clients/kubernetes-client';
import { EnvVariables } from '@/utils/env-variables';
import { TestConfigManager, TestTimeouts } from '@/utils/test-config';

export interface TrackedResource {
  name: string;
  namespace?: string;
  apiGroup: string;
  apiVersion: string;
  plural: string;
  type: string;
  isClusterScoped?: boolean;
}

export interface CleanupFixture {
  track(resource: TrackedResource): void;
  trackNamespace(name: string): void;
  trackCustomResource(
    name: string,
    namespace: string,
    apiGroup: string,
    apiVersion: string,
    plural: string,
    type?: string,
  ): void;
  readonly count: number;
  executeCleanup(): Promise<void>;
  shouldSkipCleanup(): boolean;
}

export function createCleanupFixture(testName: string): CleanupFixture {
  const resources: TrackedResource[] = [];
  const skipCleanup = process.env.SKIP_TEST_CLEANUP === 'true' || process.env.DEBUG === '1';

  function getClient(): KubernetesClient | null {
    try {
      const config = TestConfigManager.getConfig();
      const authConfig = {
        baseUrl: EnvVariables.clusterUrl,
        username: EnvVariables.username,
        password: EnvVariables.password,
        ...(config?.authToken ? { token: config.authToken } : {}),
      };
      return new KubernetesClient(undefined, authConfig, config?.kubeConfigPath);
    } catch {
      return null;
    }
  }

  return {
    track(resource: TrackedResource) {
      resources.push(resource);
    },

    trackNamespace(name: string) {
      resources.push({
        name,
        apiGroup: '',
        apiVersion: 'v1',
        plural: 'namespaces',
        type: 'Namespace',
        isClusterScoped: true,
      });
    },

    trackCustomResource(
      name: string,
      namespace: string,
      apiGroup: string,
      apiVersion: string,
      plural: string,
      type?: string,
    ) {
      resources.push({
        name,
        namespace,
        apiGroup,
        apiVersion,
        plural,
        type: type || plural,
      });
    },

    get count() {
      return resources.length;
    },

    shouldSkipCleanup() {
      return skipCleanup;
    },

    async executeCleanup() {
      if (skipCleanup || resources.length === 0) return;

      const client = getClient();
      if (!client) {
        console.warn(`[Cleanup] No K8s client available for ${testName}`);
        return;
      }

      const namespaces = resources.filter((r) => r.type === 'Namespace');
      const others = resources.filter((r) => r.type !== 'Namespace');

      for (const resource of others) {
        try {
          if (resource.apiGroup === '') {
            const coreApi = client.coreV1Api;
            switch (resource.type) {
              case 'ConfigMap':
                if (resource.namespace)
                  await coreApi.deleteNamespacedConfigMap({
                    name: resource.name,
                    namespace: resource.namespace,
                  });
                break;
              case 'Secret':
                if (resource.namespace)
                  await coreApi.deleteNamespacedSecret({
                    name: resource.name,
                    namespace: resource.namespace,
                  });
                break;
              default:
                break;
            }
          } else if (resource.namespace) {
            await client.deleteCustomResource(
              resource.apiGroup,
              resource.apiVersion,
              resource.namespace,
              resource.plural,
              resource.name,
            );
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (!msg.includes('404') && !msg.includes('not found')) {
            console.warn(`[Cleanup] Failed to delete ${resource.type} ${resource.name}: ${msg}`);
          }
        }
      }

      for (const ns of namespaces) {
        try {
          await client.coreV1Api.deleteNamespace({ name: ns.name });
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : String(error);
          if (!msg.includes('404') && !msg.includes('not found')) {
            console.warn(`[Cleanup] Failed to delete namespace ${ns.name}: ${msg}`);
          }
        }
      }

      // Wait for namespaces to terminate
      for (const ns of namespaces) {
        const deadline = Date.now() + TestTimeouts.ELEMENT_WAIT;
        while (Date.now() < deadline) {
          try {
            await client.coreV1Api.readNamespace({ name: ns.name });
            await new Promise((r) => setTimeout(r, TestTimeouts.RETRY_DELAY));
          } catch {
            break;
          }
        }
      }
    },
  };
}
