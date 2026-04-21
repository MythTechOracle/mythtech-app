#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_EPS = 1e-12;

const COMPARE_FIELDS_STRICT = [
  "beat",
  "seal_index",
  "axes_in",
  "axes_blend",
  "axes_post_mirror",
  "axes_final",
  "gates_in",
  "gates_post_ok",
  "gates_post_invariants",
  "mirror_applied",
  "mirror_axis",
  "lovelace_damped_axes"
];

const COMPARE_FIELDS_DOWNSTREAM = [
  "beat",
  "seal_index",
  "axes_blend",
  "axes_post_mirror",
  "axes_final",
  "gates_post_ok",
  "gates_post_invariants",
  "mirror_applied",
  "mirror_axis",
  "lovelace_damped_axes"
];

const TOP_LEVEL_STRICT = ["kernel_id", "beats_total", "axes"];
const TOP_LEVEL_DOWNSTREAM = ["beats_total", "axes"];

function parseArgs(argv) {
  const options = {
    epsilon: DEFAULT_EPS,
    downstreamOnly: false,
    allowCandidatePrefix: false,
    outDir: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--candidate":
        options.candidate = argv[++i];
        break;
      case "--reference":
        options.reference = argv[++i];
        break;
      case "--epsilon":
        options.epsilon = Number(argv[++i]);
        break;
      case "--downstream_only":
        options.downstreamOnly = true;
        break;
      case "--allow_candidate_prefix":
        options.allowCandidatePrefix = true;
        break;
      case "--out_dir":
        options.outDir = argv[++i] || "";
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.candidate || !options.reference) {
    throw new Error("Both --candidate and --reference are required.");
  }

  if (!Number.isFinite(options.epsilon)) {
    throw new Error("--epsilon must be a finite number.");
  }

  return options;
}

function printHelp() {
  console.log(`Delta Session Replay Verifier (CI-grade)

Usage:
  node .\\delta_ci\\delta_session_replay_verifier.mjs --candidate CAND.json --reference REF.json --out_dir out
  node .\\delta_ci\\delta_session_replay_verifier.mjs --candidate CAND.json --reference REF.json --downstream_only

Exit codes:
  0 = pass
  2 = fail (mismatches)
  3 = error (bad inputs)`);
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function numClose(a, b, epsilon) {
  return Math.abs(a - b) <= epsilon;
}

function jsonHash(value) {
  const canonical = JSON.stringify(value, Object.keys(value).sort(), 0);
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableHash(value) {
  return crypto.createHash("sha256").update(stableStringify(value), "utf8").digest("hex");
}

function pushDiff(diffs, pathName, candidate, reference, kind) {
  diffs.push({ path: pathName, candidate, reference, kind });
}

function walkDiff(pathName, candidate, reference, epsilon, diffs) {
  const candidateIsNumber = isNumber(candidate);
  const referenceIsNumber = isNumber(reference);

  if (candidateIsNumber || referenceIsNumber) {
    if (!(candidateIsNumber && referenceIsNumber) || !numClose(Number(candidate), Number(reference), epsilon)) {
      pushDiff(diffs, pathName, candidate, reference, "number_mismatch");
    }
    return;
  }

  if (candidate === null || reference === null) {
    if (candidate !== reference) {
      pushDiff(diffs, pathName, candidate, reference, "value_mismatch");
    }
    return;
  }

  if (typeof candidate !== typeof reference) {
    pushDiff(diffs, pathName, typeof candidate, typeof reference, "type_mismatch");
    return;
  }

  if (typeof candidate === "string" || typeof candidate === "boolean") {
    if (candidate !== reference) {
      pushDiff(diffs, pathName, candidate, reference, "value_mismatch");
    }
    return;
  }

  if (Array.isArray(candidate)) {
    if (!Array.isArray(reference)) {
      pushDiff(diffs, pathName, "array", typeof reference, "type_mismatch");
      return;
    }
    if (candidate.length !== reference.length) {
      pushDiff(diffs, pathName, `len=${candidate.length}`, `len=${reference.length}`, "length_mismatch");
    }
    const compareLength = Math.min(candidate.length, reference.length);
    for (let index = 0; index < compareLength; index += 1) {
      walkDiff(`${pathName}[${index}]`, candidate[index], reference[index], epsilon, diffs);
    }
    return;
  }

  if (candidate && typeof candidate === "object") {
    const candidateKeys = new Set(Object.keys(candidate));
    const referenceKeys = new Set(Object.keys(reference));
    const onlyCandidate = [...candidateKeys].filter((key) => !referenceKeys.has(key)).sort();
    const onlyReference = [...referenceKeys].filter((key) => !candidateKeys.has(key)).sort();
    if (onlyCandidate.length || onlyReference.length) {
      pushDiff(diffs, pathName, onlyCandidate, onlyReference, "keys_mismatch");
    }
    for (const key of [...candidateKeys].filter((entry) => referenceKeys.has(entry)).sort()) {
      walkDiff(pathName ? `${pathName}.${key}` : key, candidate[key], reference[key], epsilon, diffs);
    }
    return;
  }

  if (candidate !== reference) {
    pushDiff(diffs, pathName, candidate, reference, "value_mismatch");
  }
}

function indexSeries(series) {
  const result = new Map();
  for (const row of series) {
    if (row && Object.hasOwn(row, "beat")) {
      result.set(Number(row.beat), row);
    }
  }
  return result;
}

function compare(candidate, reference, epsilon, downstreamOnly, allowCandidatePrefix) {
  const diffs = [];
  const topFields = downstreamOnly ? TOP_LEVEL_DOWNSTREAM : TOP_LEVEL_STRICT;
  for (const field of topFields) {
    if (!Object.hasOwn(candidate, field) || !Object.hasOwn(reference, field)) {
      pushDiff(diffs, field, Object.hasOwn(candidate, field), Object.hasOwn(reference, field), "missing_field");
      continue;
    }
    walkDiff(field, candidate[field], reference[field], epsilon, diffs);
  }

  const candidateSeries = candidate.series;
  const referenceSeries = reference.series;
  if (!Array.isArray(candidateSeries) || !Array.isArray(referenceSeries)) {
    pushDiff(
      diffs,
      "series",
      Array.isArray(candidateSeries) ? "array" : typeof candidateSeries,
      Array.isArray(referenceSeries) ? "array" : typeof referenceSeries,
      "type_mismatch"
    );
    return { ok: false }, diffs;
  }

  const candidateIndex = indexSeries(candidateSeries);
  const referenceIndex = indexSeries(referenceSeries);
  const beats = [...new Set([...candidateIndex.keys(), ...referenceIndex.keys()])].sort((a, b) => a - b);
  const fields = downstreamOnly ? COMPARE_FIELDS_DOWNSTREAM : COMPARE_FIELDS_STRICT;
  const perBeatMaxAxisDiff = {};
  const missingBeats = {
    candidate_missing: [],
    reference_missing: []
  };

  for (const beat of beats) {
    const candidateRow = candidateIndex.get(beat);
    const referenceRow = referenceIndex.get(beat);

    if (!candidateRow) {
      missingBeats.candidate_missing.push(beat);
      continue;
    }
    if (!referenceRow) {
      missingBeats.reference_missing.push(beat);
      continue;
    }

    for (const field of fields) {
      if (!Object.hasOwn(candidateRow, field) || !Object.hasOwn(referenceRow, field)) {
        pushDiff(
          diffs,
          `series[beat=${beat}].${field}`,
          Object.hasOwn(candidateRow, field),
          Object.hasOwn(referenceRow, field),
          "missing_field"
        );
        continue;
      }
      walkDiff(`series[beat=${beat}].${field}`, candidateRow[field], referenceRow[field], epsilon, diffs);
    }

    const candidateFinal = candidateRow.axes_final;
    const referenceFinal = referenceRow.axes_final;
    if (candidateFinal && referenceFinal && typeof candidateFinal === "object" && typeof referenceFinal === "object") {
      const sharedKeys = Object.keys(candidateFinal).filter((key) => Object.hasOwn(referenceFinal, key));
      let maxDiff = 0;
      for (const key of sharedKeys) {
        if (isNumber(candidateFinal[key]) && isNumber(referenceFinal[key])) {
          maxDiff = Math.max(maxDiff, Math.abs(candidateFinal[key] - referenceFinal[key]));
        }
      }
      perBeatMaxAxisDiff[beat] = maxDiff;
    }
  }

  let expectedFuture = [];
  if (allowCandidatePrefix && candidateIndex.size > 0) {
    const maxCandidateBeat = Math.max(...candidateIndex.keys());
    expectedFuture = missingBeats.candidate_missing.filter((beat) => beat > maxCandidateBeat && referenceIndex.has(beat));
    missingBeats.candidate_missing = missingBeats.candidate_missing.filter((beat) => !expectedFuture.includes(beat));
  }

  const ok =
    diffs.length === 0 &&
    missingBeats.candidate_missing.length === 0 &&
    missingBeats.reference_missing.length === 0;

  const maxAxisFinalDiffValues = Object.values(perBeatMaxAxisDiff);
  const report = {
    ok,
    downstream_only: downstreamOnly,
    allow_candidate_prefix: allowCandidatePrefix,
    epsilon,
    candidate_hash: stableHash(candidate),
    reference_hash: stableHash(reference),
    beats_compared: beats.length,
    missing_beats: missingBeats,
    expected_future_beats_in_reference: expectedFuture,
    diff_count: diffs.length,
    max_axis_final_abs_diff: maxAxisFinalDiffValues.length ? Math.max(...maxAxisFinalDiffValues) : null,
    per_beat_max_axis_final_abs_diff: perBeatMaxAxisDiff
  };

  return { report, diffs };
}

function writeCsv(filePath, diffs) {
  const rows = [["path", "kind", "candidate", "reference"]];
  for (const diff of diffs) {
    rows.push([
      diff.path,
      diff.kind,
      JSON.stringify(diff.candidate),
      JSON.stringify(diff.reference)
    ]);
  }
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? "");
          return /[",\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
        })
        .join(",")
    )
    .join("\n");
  fs.writeFileSync(filePath, `${content}\n`, "utf8");
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return 3;
  }

  let candidate;
  let reference;
  try {
    candidate = JSON.parse(fs.readFileSync(options.candidate, "utf8"));
    reference = JSON.parse(fs.readFileSync(options.reference, "utf8"));
  } catch (error) {
    console.error(`ERROR reading inputs: ${error.message}`);
    return 3;
  }

  const { report, diffs } = compare(
    candidate,
    reference,
    options.epsilon,
    options.downstreamOnly,
    options.allowCandidatePrefix
  );

  if (options.outDir) {
    fs.mkdirSync(options.outDir, { recursive: true });
    fs.writeFileSync(
      path.join(options.outDir, "session_replay_verify_report.json"),
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8"
    );
    writeCsv(path.join(options.outDir, "session_replay_verify_diffs.csv"), diffs);
  }

  const status = report.ok ? "PASS" : "FAIL";
  console.log(
    `${status} diffs=${report.diff_count} missing_candidate=${report.missing_beats.candidate_missing.length} ` +
      `missing_reference=${report.missing_beats.reference_missing.length} max_axis_final_diff=${report.max_axis_final_abs_diff}`
  );

  return report.ok ? 0 : 2;
}

process.exit(main());
