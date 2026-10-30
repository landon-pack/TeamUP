/**
 * Route: `/workspace` → main TeamUP app (tasks, calendar, files, …).
 *
 * On localhost this opens an interactive in-memory sandbox (no Cloudflare DB).
 * On the live site it uses signed-in accounts + D1.
 */
import Workspace from '../workspace';

export default function WorkspacePage() {
  return <Workspace />;
}
