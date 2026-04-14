export class EnvVariables {
  static get clusterUrl(): string {
    if (process.env.CLUSTER_URL) return process.env.CLUSTER_URL;
    if (process.env.OPENSHIFT_CLUSTER_URL) return process.env.OPENSHIFT_CLUSTER_URL;
    const clusterName = process.env.CLUSTER_NAME;
    const clusterDomain = process.env.CLUSTER_DOMAIN;
    if (clusterName && clusterDomain) {
      return `https://api.${clusterName}.${clusterDomain}:6443`;
    }
    return 'https://api.cluster.local:6443';
  }

  static get isCI(): boolean {
    return !!process.env.CI;
  }

  static get password(): string {
    return process.env.OPENSHIFT_PASSWORD || process.env.BRIDGE_KUBEADMIN_PASSWORD || 'password';
  }

  static get testNamespace(): string {
    return process.env.TEST_NS || 'pw-test-ns';
  }

  static get testUsername(): string {
    return process.env.TEST_USERNAME || 'test';
  }

  static get testUserPassword(): string {
    return process.env.TEST_USER_PASSWORD || 'test';
  }

  static get username(): string {
    return process.env.OPENSHIFT_USERNAME || 'kubeadmin';
  }

  static get webConsoleUrl(): string {
    if (process.env.WEB_CONSOLE_URL) return process.env.WEB_CONSOLE_URL;
    if (process.env.BASE_URL) return process.env.BASE_URL;
    if (process.env.BRIDGE_BASE_ADDRESS) return process.env.BRIDGE_BASE_ADDRESS;
    const clusterName = process.env.CLUSTER_NAME;
    const clusterDomain = process.env.CLUSTER_DOMAIN;
    if (clusterName && clusterDomain) {
      return `https://console-openshift-console.apps.${clusterName}.${clusterDomain}/`;
    }
    return 'http://localhost:9000';
  }

  static get kubeConfigPath(): string | undefined {
    return process.env.KUBECONFIG;
  }

  static get isDebugMode(): boolean {
    return process.env.DEBUG === '1' || process.env.DEBUG === 'true';
  }

  static get ignoreWelcome(): boolean {
    return (
      process.env.IGNORE_WELCOME === '1' || process.env.IGNORE_WELCOME?.toLowerCase() === 'true'
    );
  }

  static get isNonPrivUser(): boolean {
    return process.env.NON_PRIV === '1' || process.env.NON_PRIV?.toLowerCase() === 'true';
  }

  static get uiLoginUsername(): string {
    return EnvVariables.isNonPrivUser ? 'test' : EnvVariables.username;
  }

  static get uiLoginPassword(): string {
    return EnvVariables.isNonPrivUser ? 'test' : EnvVariables.password;
  }

  static get useAllure(): boolean {
    const v = process.env.USE_ALLURE;
    if (v === '0' || v?.toLowerCase() === 'false') return false;
    return true;
  }

  static get retries(): number {
    if (process.env.PLAYWRIGHT_RETRIES !== undefined) {
      const retries = parseInt(process.env.PLAYWRIGHT_RETRIES, 10);
      return isNaN(retries) ? 1 : Math.max(0, retries);
    }
    return 1;
  }

  static get isLocalhost(): boolean {
    const url = this.webConsoleUrl;
    return /localhost|127\.0\.0\.1/.test(url);
  }

  static get isVideoEnabled(): boolean {
    const v = process.env.PLAYWRIGHT_VIDEO;
    if (v === '0' || v?.toLowerCase() === 'false') return false;
    return true;
  }
}
