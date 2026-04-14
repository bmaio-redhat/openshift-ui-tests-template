import * as fs from 'fs';
import * as path from 'path';

import AllureReporter from 'allure-playwright';

import type { FullConfig } from '@playwright/test';
import type {
  FullResult,
  Suite,
  TestCase,
  TestResult as PlaywrightTestResult,
  TestStep,
} from '@playwright/test/reporter';

type AllureConfig = ConstructorParameters<typeof AllureReporter>[0];

export default class AllureNoStdoutReporter {
  private inner: InstanceType<typeof AllureReporter>;
  private resultsDir: string | undefined;

  constructor(config?: AllureConfig) {
    this.inner = new AllureReporter(config ?? {});
    this.resultsDir = (config as { resultsDir?: string } | undefined)?.resultsDir;
  }

  onConfigure(config: FullConfig): void {
    this.inner.onConfigure(config);
  }
  onBegin(suite: Suite): void {
    this.inner.onBegin(suite);
  }
  onTestBegin(test: TestCase, result: PlaywrightTestResult): void {
    (this.inner as any).onTestBegin(test, result);
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onStdOut(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onStdErr(): void {}

  async onTestEnd(test: TestCase, result: PlaywrightTestResult): Promise<void> {
    const attachments = [...(result.attachments ?? [])];
    if (this.resultsDir) {
      try {
        const artifactsPath = path.join(this.resultsDir, '.failure-artifacts', `${test.id}.json`);
        if (fs.existsSync(artifactsPath)) {
          const data = JSON.parse(fs.readFileSync(artifactsPath, 'utf-8')) as {
            screenshotPath?: string | null;
            videoPath?: string | null;
          };
          fs.unlinkSync(artifactsPath);
          if (data.screenshotPath && fs.existsSync(data.screenshotPath)) {
            attachments.push({
              name: 'failure-screenshot',
              path: data.screenshotPath,
              contentType: 'image/png',
            });
          }
          if (data.videoPath && fs.existsSync(data.videoPath)) {
            attachments.push({ name: 'video', path: data.videoPath, contentType: 'video/webm' });
          }
        }
      } catch {
        /* ignore */
      }
    }
    const resultWithoutStdio = { ...result, stdout: [], stderr: [], attachments };
    await this.inner.onTestEnd(test, resultWithoutStdio);
  }

  onStepBegin(test: TestCase, result: PlaywrightTestResult, step: TestStep): void {
    this.inner.onStepBegin(test, result, step);
  }
  onStepEnd(test: TestCase, result: PlaywrightTestResult, step: TestStep): void {
    this.inner.onStepEnd(test, result, step);
  }
  onEnd(result: FullResult): Promise<void | { status?: FullResult['status'] }> {
    return (this.inner as any).onEnd(result);
  }
  onExit(): void | Promise<void> {
    return this.inner.onExit();
  }
  onError(error: unknown): void {
    if (typeof this.inner.onError === 'function') (this.inner as any).onError(error);
  }
  printsToStdio(): boolean {
    return this.inner.printsToStdio();
  }
  version(): 'v2' {
    return 'v2';
  }
}
