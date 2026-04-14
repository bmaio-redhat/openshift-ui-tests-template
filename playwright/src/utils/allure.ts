export const ALLURE_TIER1_FEATURE = 'Tier 1';

const TIER1_TAG_VARIANTS = new Set(['@tier1', 'tier1']);

export type AllureMeta = {
  suite?: string;
  feature?: string;
  tags?: string[];
};

export async function withAllure(meta: AllureMeta): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { allure } = require('allure-playwright');
    if (!allure) return;
    if (meta.suite) await allure.suite(meta.suite);
    const feature =
      meta.feature === 'Tier1' || TIER1_TAG_VARIANTS.has(meta.feature || '')
        ? ALLURE_TIER1_FEATURE
        : meta.feature;
    if (feature) await allure.feature(feature);
    if (meta.tags && Array.isArray(meta.tags)) {
      for (const tag of meta.tags) {
        if (!TIER1_TAG_VARIANTS.has(tag)) await allure.tag(tag);
      }
    }
  } catch {
    /* no-op */
  }
}

export function logUrlToAllure(url: string, stepName = 'Current URL'): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { allure } = require('allure-playwright');
    if (!allure) return;
    allure.attachment(stepName, url, 'text/plain');
  } catch {
    /* no-op */
  }
}
