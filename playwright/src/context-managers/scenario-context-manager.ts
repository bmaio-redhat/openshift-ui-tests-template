import { ContextKey, ContextValueType } from './context-keys';

export default class ScenarioContextManager {
  private static instance: ScenarioContextManager;
  private store: Map<string, unknown>;

  private constructor() {
    this.store = new Map();
  }

  public static getInstance(): ScenarioContextManager {
    if (!ScenarioContextManager.instance) {
      ScenarioContextManager.instance = new ScenarioContextManager();
    }
    return ScenarioContextManager.instance;
  }

  public clear(): void {
    this.store.clear();
  }

  public get<K extends ContextKey>(key: K): ContextValueType<K> | undefined;
  public get<T>(key: string): T | undefined;
  public get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  public overwrite<K extends ContextKey>(key: K, value: ContextValueType<K>): this;
  public overwrite<T>(key: string, value: T): this;
  public overwrite<T>(key: string, value: T): this {
    if (!this.store.has(key)) throw new Error(`Key "${key}" does not exist. Cannot overwrite.`);
    this.store.set(key, value);
    return this;
  }

  public set<K extends ContextKey>(key: K, value: ContextValueType<K>): this;
  public set<T>(key: string, value: T): this;
  public set<T>(key: string, value: T): this {
    this.store.set(key, value);
    return this;
  }

  public has(key: ContextKey | string): boolean {
    return this.store.has(key);
  }
  public delete(key: ContextKey | string): boolean {
    return this.store.delete(key);
  }
  public keys(): IterableIterator<string> {
    return this.store.keys();
  }
}
