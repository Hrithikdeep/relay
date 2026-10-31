// Absolute filesystem paths under the usual server/dev roots. Starts at a path
// boundary so URLs and API routes like "/v1/jobs" are never touched.
const ABSOLUTE_PATH =
  /(?<![\w./:-])(?:\/(?:Users|home|root|app|var|opt|usr|srv|workspace|tmp|private|mnt)\/[^\s()'"`:]+|[A-Za-z]:\\[^\s()'"`:]+)/g;

// Where a project-relative path starts, in order of preference.
const PROJECT_MARKERS = ['/node_modules/', '/src/', '/dist/', '/build/'];

function shortenPath(path: string): string {
  const normalized = path.replace(/\\/g, '/');

  for (const marker of PROJECT_MARKERS) {
    const at = normalized.indexOf(marker);
    if (at !== -1) return normalized.slice(at + 1);
  }

  const parts = normalized.split('/').filter(Boolean);
  return `…/${parts.slice(-2).join('/')}`;
}

// Removes the machine-specific prefix from file paths in error messages and
// stack traces (/Users/someone/proj/backend/src/core/Job.ts -> src/core/Job.ts)
// while keeping the frame, file name, line and column. Mirrors
// frontend/src/lib/redact.ts, which stays as a display-time safety net.
export function redactPaths(text: string): string {
  return text.replace(ABSOLUTE_PATH, shortenPath);
}
