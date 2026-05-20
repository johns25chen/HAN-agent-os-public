#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  evaluateReleaseIntegrity,
  requiredDocuments,
  requiredEvidenceForbiddenFields,
  requiredReadmeTools,
  requiredScripts,
  requiredStableTags,
} from "./check-release-integrity.mjs";

const missingFields = [
  "missing_tags",
  "missing_documents",
  "missing_scripts",
  "missing_readme_tools",
  "missing_forbidden_fields",
];

function completeInput() {
  return {
    localTags: [...requiredStableTags],
    existingDocuments: [...requiredDocuments],
    existingScripts: [...requiredScripts],
    readmeText: requiredReadmeTools.join("\n"),
    evidenceSopText: requiredEvidenceForbiddenFields.join("\n"),
  };
}

function withoutItem(items, itemToRemove) {
  return items.filter((item) => item !== itemToRemove);
}

function assertOnlyExpectedMissing(result, expectedMissingField) {
  assert.equal(result.release_integrity_result, "fail");
  assert.notDeepEqual(result[expectedMissingField], []);

  for (const field of missingFields) {
    if (field !== expectedMissingField) {
      assert.deepEqual(result[field], [], `${field} should stay empty`);
    }
  }
}

const fixtures = [
  {
    name: "missing_tags",
    expectedMissingField: "missing_tags",
    input: {
      ...completeInput(),
      localTags: withoutItem(requiredStableTags, requiredStableTags[0]),
    },
  },
  {
    name: "missing_documents",
    expectedMissingField: "missing_documents",
    input: {
      ...completeInput(),
      existingDocuments: withoutItem(requiredDocuments, requiredDocuments[0]),
    },
  },
  {
    name: "missing_scripts",
    expectedMissingField: "missing_scripts",
    input: {
      ...completeInput(),
      existingScripts: withoutItem(requiredScripts, requiredScripts[0]),
    },
  },
  {
    name: "missing_readme_tools",
    expectedMissingField: "missing_readme_tools",
    input: {
      ...completeInput(),
      readmeText: withoutItem(requiredReadmeTools, requiredReadmeTools[0]).join("\n"),
    },
  },
  {
    name: "missing_forbidden_fields",
    expectedMissingField: "missing_forbidden_fields",
    input: {
      ...completeInput(),
      evidenceSopText: withoutItem(
        requiredEvidenceForbiddenFields,
        requiredEvidenceForbiddenFields[0],
      ).join("\n"),
    },
  },
];

for (const fixture of fixtures) {
  const result = evaluateReleaseIntegrity(fixture.input);
  assertOnlyExpectedMissing(result, fixture.expectedMissingField);
}

console.log("release integrity negative fixtures passed");
