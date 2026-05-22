import { env } from './env';

/** Build a namespaced resource list URL. */
export const resourceUrl = (gvk: string, ns?: string): string =>
  `/k8s/${ns ? `ns/${ns}` : 'all-namespaces'}/${gvk}`;

/** Build a cluster-scoped resource list URL. */
export const clusterResourceUrl = (gvk: string): string => `/k8s/cluster/${gvk}`;

/**
 * Named URL builders for common OpenShift Console routes.
 * Extend this object as new feature areas are added to the test suite.
 */
export const urls = {
  home: () => '/',
  namespaces: () => clusterResourceUrl('core~v1~Namespace'),
  nodes: () => clusterResourceUrl('core~v1~Node'),
  projects: (ns?: string) => resourceUrl('core~v1~Namespace', ns),
  workloads: (ns?: string) => resourceUrl('core~v1~Pod', ns),
  settings: (ns = env.testNamespace) => `/k8s/ns/${ns}/settings`,
};
