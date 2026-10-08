// Comment-run budget (ported from Helios tools/comment_budget.mjs). Applies to
// the whole edited file, upstream TrinityCore comments included.
export const LIMIT = 2;

export const COVERED = /\.(cpp|h|hpp|c|cc|ts|mjs|js)$/;

// Vendored third-party source stays verbatim.
export const EXCLUDE = /^(dep|node_modules)\/|\/node_modules\//;

const IS_DOC = /^\s*(\/\/\/|\/\/!)/;
const IS_COMMENT = (l) => !IS_DOC.test(l) && /^\s*\/\//.test(l);

// Runs of consecutive prose `//` lines longer than LIMIT. A run starting at
// line 1 is a file header and exempt.
export function longRuns(text, limit = LIMIT) {
  const lines = text.split(/\r?\n/);
  const runs = [];
  let start = 0, len = 0;
  for (let i = 0; i <= lines.length; i++) {
    if (i < lines.length && IS_COMMENT(lines[i])) {
      if (len === 0) start = i + 1;
      len++;
    } else {
      if (len > limit && start > 1) runs.push({ start, len });
      len = 0;
    }
  }
  return runs;
}
