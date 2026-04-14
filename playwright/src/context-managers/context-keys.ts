export enum ContextKey {
  CONFIG_TEST_NAMESPACE = 'testNamespace',
  CONFIG_PROJECT_NAME = 'projectName',
  NAMESPACE = 'namespace',
}

export interface ContextValueTypeMap {
  [ContextKey.CONFIG_TEST_NAMESPACE]: string;
  [ContextKey.CONFIG_PROJECT_NAME]: string;
  [ContextKey.NAMESPACE]: string;
}

export type ContextValueType<K extends ContextKey> = K extends keyof ContextValueTypeMap
  ? ContextValueTypeMap[K]
  : unknown;
