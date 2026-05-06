import { redirect } from "next/navigation";
import { readState } from "@/lib/state";
import { AuditClient } from "./AuditClient";

// Server-side gate: only premium clients (i.e. students who already
// completed the mass-assignment challenge) can see the activity page.
// Anyone else gets bounced back to the dashboard so the climax of the
// CTF is not spoiled.
export default async function AuditPage() {
  const state = await readState();
  if (!state.user.isPremium) redirect("/dashboard");
  return <AuditClient />;
}
