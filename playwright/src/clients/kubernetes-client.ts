import * as fs from 'fs';
import * as https from 'https';
import * as net from 'net';
import * as path from 'path';
import { URL } from 'url';

import { waitForCondition } from '@/utils/wait-helpers';
import * as k8s from '@kubernetes/client-node';
import { Page } from '@playwright/test';

import BaseClient, { ClusterAuthConfig } from './base-client';

export default class KubernetesClient extends BaseClient {
  private static hasShownAuthWarning = false;
  private appsApi: k8s.AppsV1Api;
  private coApi: k8s.CustomObjectsApi;
  private k8sApi: k8s.CoreV1Api;
  private rbacAuthorizationApi: k8s.RbacAuthorizationV1Api;
  private kubeConfig: k8s.KubeConfig;
  private kubeConfigPath?: string;

  private static getProxyUrl(): string | undefined {
    return (
      process.env.HTTPS_PROXY ||
      process.env.https_proxy ||
      process.env.HTTP_PROXY ||
      process.env.http_proxy
    );
  }

  private static createProxyAgent(proxyUrl: string): https.Agent {
    const proxy = new URL(proxyUrl);
    return new https.Agent({
      rejectUnauthorized: false,
      createConnection: (options, callback) => {
        const proxySocket = net.connect(
          { host: proxy.hostname, port: parseInt(proxy.port || '3128', 10) },
          () => {
            proxySocket.write(
              [
                `CONNECT ${options.host}:${options.port} HTTP/1.1`,
                `Host: ${options.host}:${options.port}`,
                'Connection: keep-alive',
                '',
                '',
              ].join('\r\n'),
            );
          },
        );
        let responseData = '';
        const onData = (chunk: Buffer) => {
          responseData += chunk.toString();
          if (responseData.includes('\r\n\r\n')) {
            proxySocket.removeListener('data', onData);
            const [statusLine] = responseData.split('\r\n');
            const statusCode = parseInt(statusLine.split(' ')[1], 10);
            if (statusCode === 200) {
              callback(null, proxySocket);
            } else {
              proxySocket.destroy();
              callback(new Error(`Proxy CONNECT failed: ${statusCode}`) as any, null as any);
            }
          }
        };
        proxySocket.on('data', onData);
        proxySocket.on('error', (err) => {
          callback(err as any, null as any);
        });
      },
    } as https.AgentOptions);
  }

  static async getOAuthToken(
    clusterUrl: string,
    username: string,
    password: string,
  ): Promise<string> {
    const oauthServerUrl = await KubernetesClient.getOAuthServerUrl(clusterUrl);
    return new Promise((resolve, reject) => {
      const authHeader = Buffer.from(`${username}:${password}`).toString('base64');
      const tokenUrl = new URL('/oauth/authorize', oauthServerUrl);
      tokenUrl.searchParams.set('response_type', 'token');
      tokenUrl.searchParams.set('client_id', 'openshift-challenging-client');
      const proxyUrl = KubernetesClient.getProxyUrl();
      const agent = proxyUrl ? KubernetesClient.createProxyAgent(proxyUrl) : undefined;
      const options: https.RequestOptions = {
        hostname: tokenUrl.hostname,
        port: tokenUrl.port || 443,
        path: tokenUrl.pathname + tokenUrl.search,
        method: 'GET',
        headers: { Authorization: `Basic ${authHeader}`, 'X-CSRF-Token': '1' },
        rejectUnauthorized: false,
        agent,
      };
      const req = https.request(options, (res) => {
        const location = res.headers.location;
        if (location && location.includes('access_token=')) {
          const match = location.match(/access_token=([^&]+)/);
          if (match) {
            resolve(match[1]);
            return;
          }
        }
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          reject(
            new Error(
              `OAuth authentication failed: HTTP ${res.statusCode}. Response: ${body.substring(
                0,
                200,
              )}`,
            ),
          );
        });
      });
      req.on('error', (err) => {
        reject(new Error(`OAuth request failed: ${err.message}`));
      });
      req.end();
    });
  }

  private static async getOAuthServerUrl(clusterUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const url = new URL('/.well-known/oauth-authorization-server', clusterUrl);
      const proxyUrl = KubernetesClient.getProxyUrl();
      const agent = proxyUrl ? KubernetesClient.createProxyAgent(proxyUrl) : undefined;
      const options: https.RequestOptions = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'GET',
        rejectUnauthorized: false,
        agent,
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body).issuer || clusterUrl);
          } catch {
            resolve(clusterUrl);
          }
        });
      });
      req.on('error', () => {
        resolve(clusterUrl);
      });
      req.end();
    });
  }

  static async generateKubeconfig(
    clusterUrl: string,
    username: string,
    password: string,
    outputPath: string,
  ): Promise<string> {
    const token = await KubernetesClient.getOAuthToken(clusterUrl, username, password);
    const kubeconfigYaml = `apiVersion: v1\nkind: Config\nclusters:\n  - name: cluster\n    cluster:\n      server: ${clusterUrl}\n      insecure-skip-tls-verify: true\ncontexts:\n  - name: context\n    context:\n      cluster: cluster\n      user: user\ncurrent-context: context\nusers:\n  - name: user\n    user:\n      token: ${token}\n`;
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, kubeconfigYaml, 'utf8');
    return outputPath;
  }

  constructor(
    page: Page | undefined,
    config: ClusterAuthConfig & { token?: string },
    kubeConfigPath?: string,
  ) {
    super(page, config);
    this.kubeConfig = new k8s.KubeConfig();
    const effectiveKubeConfigPath = kubeConfigPath || this.tryDiscoverKubeConfig();
    if (effectiveKubeConfigPath && fs.existsSync(effectiveKubeConfigPath)) {
      this.kubeConfig.loadFromFile(effectiveKubeConfigPath);
      this.kubeConfigPath = effectiveKubeConfigPath;
    } else if (config.token) {
      this.kubeConfig.loadFromOptions({
        clusters: [{ name: 'cluster', server: this.baseUrl, skipTLSVerify: true }],
        contexts: [{ cluster: 'cluster', name: 'context', user: 'user' }],
        currentContext: 'context',
        users: [{ name: 'user', token: config.token }],
      });
    } else {
      if (!KubernetesClient.hasShownAuthWarning) {
        KubernetesClient.hasShownAuthWarning = true;
        console.warn(
          '⚠️ WARNING: Using username/password authentication without token or kubeconfig.',
        );
      }
      this.kubeConfig.loadFromOptions({
        clusters: [{ name: 'cluster', server: this.baseUrl, skipTLSVerify: true }],
        contexts: [{ cluster: 'cluster', name: 'context', user: 'user' }],
        currentContext: 'context',
        users: [{ name: 'user', password: this.password, username: this.username }],
      });
    }
    const proxyUrlForTls = KubernetesClient.getProxyUrl();
    if (proxyUrlForTls && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    this.k8sApi = this.kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.coApi = this.kubeConfig.makeApiClient(k8s.CustomObjectsApi);
    this.appsApi = this.kubeConfig.makeApiClient(k8s.AppsV1Api);
    this.rbacAuthorizationApi = this.kubeConfig.makeApiClient(k8s.RbacAuthorizationV1Api);
  }

  private tryDiscoverKubeConfig(): string | undefined {
    const kubeConfigDir = path.join(process.cwd(), '.kubeconfigs');
    const configPath = path.join(kubeConfigDir, 'test-config');
    if (fs.existsSync(configPath)) return configPath;
    return undefined;
  }

  get kc(): k8s.KubeConfig {
    return this.kubeConfig;
  }
  get coreV1Api(): k8s.CoreV1Api {
    return this.k8sApi;
  }
  get customObjectsApi(): k8s.CustomObjectsApi {
    return this.coApi;
  }
  get appsV1Api(): k8s.AppsV1Api {
    return this.appsApi;
  }
  get rbacApi(): k8s.RbacAuthorizationV1Api {
    return this.rbacAuthorizationApi;
  }

  getCurrentUserToken(): string | undefined {
    try {
      return this.kubeConfig.getCurrentUser()?.token;
    } catch {
      return undefined;
    }
  }

  async verifyAuthentication(): Promise<boolean> {
    await this.k8sApi.listNamespace({ limit: 1 });
    return true;
  }

  async createNamespace(name: string, labels?: Record<string, string>): Promise<boolean> {
    try {
      const existing = await this.k8sApi.readNamespace({ name }).catch(() => null);
      if (existing) return true;
    } catch {
      /* not found */
    }
    const body: k8s.V1Namespace = {
      metadata: { name, labels: { ...labels, 'openshift.io/run-level': '0' } },
    };
    await this.k8sApi.createNamespace({ body });
    return true;
  }

  async namespaceExists(name: string): Promise<boolean> {
    try {
      await this.k8sApi.readNamespace({ name });
      return true;
    } catch {
      return false;
    }
  }

  async deleteNamespace(name: string): Promise<boolean> {
    try {
      await this.k8sApi.deleteNamespace({ name });
      return true;
    } catch {
      return false;
    }
  }

  async waitForNamespaceReady(name: string, timeout = 30000): Promise<boolean> {
    return waitForCondition(
      async () => {
        try {
          const ns = await this.k8sApi.readNamespace({ name });
          return ns?.status?.phase === 'Active';
        } catch {
          return false;
        }
      },
      timeout,
      1000,
    );
  }

  async setupConsoleUserSettings(
    username = 'kubeadmin',
    defaultNamespace?: string,
  ): Promise<boolean> {
    const namespace = 'openshift-console-user-settings';
    const configMapName = `user-settings-${username}`;
    const patchData: Record<string, string> = {
      'console.guidedTour': JSON.stringify({
        admin: { completed: true },
        dev: { completed: true },
      }),
    };
    if (defaultNamespace) patchData['console.lastNamespace'] = defaultNamespace;
    try {
      await this.patchConfigMap(configMapName, namespace, patchData);
      return true;
    } catch {
      return false;
    }
  }

  async patchConfigMap(
    name: string,
    namespace: string,
    patchData: Record<string, string>,
  ): Promise<any> {
    try {
      const existing = await this.k8sApi.readNamespacedConfigMap({ name, namespace });
      const existingData = (existing as any)?.data || {};
      const mergedData = { ...existingData, ...patchData };
      const body = { data: mergedData };
      return await this.k8sApi.patchNamespacedConfigMap({ name, namespace, body } as any);
    } catch (error: any) {
      throw new Error(`Failed to patch ConfigMap ${name}: ${error.message}`);
    }
  }

  async getConfigMap(name: string, namespace: string): Promise<any | null> {
    try {
      return await this.k8sApi.readNamespacedConfigMap({ name, namespace });
    } catch {
      return null;
    }
  }

  async createCustomResource(
    group: string,
    version: string,
    namespace: string,
    plural: string,
    body: any,
  ) {
    try {
      const response = await this.coApi.createNamespacedCustomObject({
        body,
        group,
        namespace,
        plural,
        version,
      });
      return response.body;
    } catch (error: any) {
      throw new Error(`Failed to create custom resource: ${error.message}`);
    }
  }

  async deleteCustomResource(
    group: string,
    version: string,
    namespace: string,
    plural: string,
    name: string,
  ) {
    try {
      const response = await this.coApi.deleteNamespacedCustomObject({
        group,
        name,
        namespace,
        plural,
        version,
      });
      return response.body;
    } catch (error: any) {
      throw new Error(`Failed to delete custom resource ${name}: ${error.message}`);
    }
  }

  async getCustomResource(
    group: string,
    version: string,
    namespace: string,
    plural: string,
    name: string,
  ) {
    try {
      const response = await this.coApi.getNamespacedCustomObject({
        group,
        name,
        namespace,
        plural,
        version,
      });
      return (response as any).body || response;
    } catch (error: any) {
      throw new Error(`Failed to get custom resource ${name}: ${error.message}`);
    }
  }

  async listCustomResources(group: string, version: string, namespace: string, plural: string) {
    try {
      const response = await this.coApi.listNamespacedCustomObject({
        group,
        namespace,
        plural,
        version,
      });
      return (response as any)?.body?.items || (response as any)?.items || [];
    } catch {
      return [];
    }
  }

  async getPods(namespace: string) {
    try {
      const response = await this.k8sApi.listNamespacedPod({ namespace });
      return response.items || [];
    } catch (error: any) {
      throw new Error(`Failed to get pods in namespace ${namespace}: ${error.message}`);
    }
  }

  async setupTestNamespace(namespace: string, labels?: Record<string, string>): Promise<boolean> {
    const exists = await this.namespaceExists(namespace);
    if (exists) return true;
    await this.createNamespace(namespace, labels);
    return await this.waitForNamespaceReady(namespace);
  }
}
