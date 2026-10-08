#!/usr/bin/env node
// PostToolUse(Edit|Write) gate: blocks an edit that leaves any prose comment
// run longer than LIMIT in the file. Wired in .claude/settings.json.
import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { LIMIT, COVERED, EXCLUDE, longRuns } from './comment_budget.mjs';

const repoRoot = resolve(import.meta.dirname, '..');

let payload;
try { payload = JSON.parse(readFileSync(0, 'utf8')); } catch { process.exit(0); }

const abs = payload?.tool_response?.filePath || payload?.tool_input?.file_path;
if (!abs) process.exit(0);

const rel = relative(repoRoot, resolve(abs)).split(sep).join('/');
if (rel.startsWith('..') || !COVERED.test(rel) || EXCLUDE.test(rel)) process.exit(0);

let text;
try { text = readFileSync(abs, 'utf8'); } catch { process.exit(0); }

const runs = longRuns(text);
if (runs.length === 0) process.exit(0);

const shown = runs.slice(0, 10).map(({ start, len }) => `${rel}:${start} (${len} lines)`).join(', ');
const more = runs.length > 10 ? ` and ${runs.length - 10} more` : '';
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason:
    `${runs.length} comment run(s) over the ${LIMIT}-line limit: ${shown}${more}. ` +
    `CLAUDE.md caps inline comments at ${LIMIT} lines: state only the ` +
    `non-obvious "why". Move longer reasoning into docs/mop-port/ and leave a ` +
    `one-line pointer. This covers the WHOLE file, upstream TrinityCore ` +
    `comments included. Fix EVERY run listed, including ones your edit did ` +
    `not write -- never ignore this report.`,
}));
