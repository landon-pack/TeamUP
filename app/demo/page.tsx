/**
 * Route: `/demo` → same workspace UI, but in guest/demo mode (no account).
 * Linked from the landing page “Try demo” button.
 */
import Workspace from '../workspace';

export default function DemoPage() {
  return <Workspace demoMode />;
}
