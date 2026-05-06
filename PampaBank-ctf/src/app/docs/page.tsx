import { redirect } from "next/navigation";
import { readState } from "@/lib/state";
import { DocsClient } from "./DocsClient";

// Server-side gate: /docs is the post-activity complement, not the
// primary path to solve the CTF. Pre-victory students are bounced back
// to the dashboard so the class flow (Burp/DevTools first) is preserved.
export default async function DocsPage() {
  const state = await readState();
  if (!state.user.isPremium) redirect("/dashboard");
  return <DocsClient />;
}
