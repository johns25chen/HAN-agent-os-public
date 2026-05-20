import * as z from 'zod/v4';

export const releaseIntegrityCheckInputSchema = {
  json: z.boolean().optional().describe('Reserved for clients that distinguish structured output.'),
};

export type ReleaseIntegrityCheckResult = {
  release_integrity_result: 'pass' | 'fail';
  checked_tags: string[];
  missing_tags: string[];
  checked_documents: string[];
  missing_documents: string[];
  checked_scripts: string[];
  missing_scripts: string[];
  checked_readme_tools: string[];
  missing_readme_tools: string[];
  checked_forbidden_fields: string[];
  missing_forbidden_fields: string[];
};

type ReleaseIntegrityCheckModule = {
  runReleaseIntegrityCheck: () => Promise<ReleaseIntegrityCheckResult>;
};

const releaseIntegrityScript = new URL('../../scripts/check-release-integrity.mjs', import.meta.url);

export async function releaseIntegrityCheck(_input: { json?: boolean }): Promise<ReleaseIntegrityCheckResult> {
  const module = (await import(releaseIntegrityScript.href)) as ReleaseIntegrityCheckModule;
  return module.runReleaseIntegrityCheck();
}
