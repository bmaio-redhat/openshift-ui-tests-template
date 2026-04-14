import * as fs from 'fs';
import * as path from 'path';

import { EnvVariables } from './env-variables';

const PIPELINE_ARTIFACT_DIRS = [
  'allure-results',
  'allure-report',
  'test-results',
  'junit-results',
] as const;

function ensurePipelineArtifactDirs(repoRoot: string): void {
  for (const name of PIPELINE_ARTIFACT_DIRS) {
    try {
      fs.mkdirSync(path.join(repoRoot, name), { recursive: true });
    } catch {
      /* ignore */
    }
  }
}

export function getTestResultsDir(repoRoot: string): string {
  if (process.env.PLAYWRIGHT_OUTPUT_DIR) {
    const dir = process.env.PLAYWRIGHT_OUTPUT_DIR;
    return path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
  }
  if (process.env.ARTIFACTS_DIR) {
    ensurePipelineArtifactDirs(repoRoot);
    return path.join(repoRoot, 'allure-results');
  }
  if (EnvVariables.useAllure) {
    ensurePipelineArtifactDirs(repoRoot);
    return path.join(repoRoot, 'allure-results');
  }
  return path.join(repoRoot, 'test-results');
}
