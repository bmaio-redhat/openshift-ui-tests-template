import { Page } from '@playwright/test';

export interface ClusterAuthConfig {
  baseUrl: string;
  password: string;
  token?: string;
  username: string;
}

export default abstract class BaseClient {
  protected readonly baseUrl: string;
  public readonly page?: Page;
  protected readonly password: string;
  protected readonly username: string;

  constructor(page: Page | undefined, config: ClusterAuthConfig) {
    this.page = page;
    this.baseUrl = config.baseUrl;
    this.username = config.username;
    this.password = config.password;
  }
}
