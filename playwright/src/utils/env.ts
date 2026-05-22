/** Environment variables consumed by Playwright tests. */
export const env = {
  baseURL: (() => {
    const addr = process.env.WEB_CONSOLE_URL ?? process.env.BRIDGE_BASE_ADDRESS ?? 'http://localhost:9000';
    const path = process.env.BRIDGE_BASE_PATH ?? '/';
    return `${addr}${path}`.replace(/\/$/, '');
  })(),

  clusterURL: process.env.CLUSTER_URL ?? '',
  kubeadminIdp: process.env.BRIDGE_HTPASSWD_IDP ?? 'kube:admin',
  kubeadminPassword: process.env.BRIDGE_KUBEADMIN_PASSWORD ?? '',
  kubeadminUsername: process.env.BRIDGE_HTPASSWD_USERNAME ?? 'kubeadmin',
  testNamespace: process.env.TEST_NS ?? 'pw-test-ns',
} as const;
