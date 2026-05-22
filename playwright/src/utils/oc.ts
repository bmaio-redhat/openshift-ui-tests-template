import { execSync, ExecSyncOptions } from 'child_process';

const DEFAULT_OPTS: ExecSyncOptions = { stdio: 'pipe', timeout: 300_000 };

/** Run an `oc` command and return stdout as a string. Throws on non-zero exit. */
export function oc(cmd: string, opts?: ExecSyncOptions): string {
  return execSync(`oc ${cmd}`, { ...DEFAULT_OPTS, ...opts })
    .toString()
    .trim();
}

/** Run an `oc` command, ignoring errors (returns empty string on failure). */
export function ocIgnore(cmd: string): string {
  try {
    return oc(cmd);
  } catch {
    return '';
  }
}

/** Apply a Kubernetes manifest from a YAML string. */
export function applyManifest(yaml: string): void {
  execSync('oc apply -f -', { ...DEFAULT_OPTS, input: yaml });
}

/** Delete a resource, ignoring not-found errors. */
export function deleteResource(kind: string, name: string, ns?: string): void {
  const nsFlag = ns ? `-n ${ns}` : '';
  ocIgnore(`delete ${kind} ${name} ${nsFlag} --ignore-not-found --wait=false`);
}

/** Wait for a resource condition using `oc wait`. */
export function waitForCondition(
  resource: string,
  ns: string,
  condition: string,
  timeout = '300s',
): void {
  oc(`wait ${resource} -n ${ns} --for=condition=${condition} --timeout=${timeout}`);
}

/** Wait for a jsonpath field on a resource to equal an expected value. */
export function waitForJsonpath(
  resource: string,
  ns: string,
  jsonpath: string,
  value: string,
  timeout = '30s',
): void {
  oc(`wait ${resource} -n ${ns} --for=jsonpath='${jsonpath}'=${value} --timeout=${timeout}`);
}

/** Patch a resource's run strategy. */
export function patchRunStrategy(
  kind: string,
  name: string,
  ns: string,
  strategy: string,
): void {
  oc(`patch ${kind} ${name} -n ${ns} --type=merge -p '{"spec":{"runStrategy":"${strategy}"}}'`);
}
