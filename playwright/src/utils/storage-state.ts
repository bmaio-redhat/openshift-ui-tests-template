import * as fs from 'fs';
import * as path from 'path';

import { EnvVariables } from './env-variables';

export function getStorageStatePath(configDirname: string): string | undefined {
  const storageStateDir = path.resolve(configDirname, '..', '.storage-states');
  const storageStatePath = path.join(storageStateDir, 'test-state.json');
  if (fs.existsSync(storageStatePath)) return storageStatePath;
  if (!EnvVariables.isLocalhost) {
    console.warn(
      `Storage state file not found at ${storageStatePath} - contexts will start without authentication`,
    );
  }
  return undefined;
}
