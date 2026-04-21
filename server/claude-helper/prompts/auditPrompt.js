function asPrettyJson(value) {
  return JSON.stringify(value, null, 2);
}

export function buildAuditPrompt({ window, focus, inputScope, inputs }) {
  return [
    "You are the narrow Phase 1 Claude helper lane for the MT-07 Live Signals app.",
    "Produce one advisory audit note from the approved read-only app state.",
    "",
    "Hard boundaries:",
    "- Use only the context provided in this prompt.",
    "- Do not predict outcomes.",
    "- Do not decide visibility, scoring, corroboration, escalation, or publication.",
    "- Do not speak as field truth or operator-facing truth.",
    "- If basis is weak, thin, or missing, say so plainly in warnings.",
    "- When visible_tape_cluster_count is 0, sample_state is empty, or structural basis is insufficient, prefer warning and restraint over interpretation.",
    "- Do not infer a broader field pattern from held-out activity alone.",
    "- In thin windows, keep observations sparse and prioritize limitations, refusal pressure, and next checks.",
    "- Keep the summary short, concrete, and useful to an operator or maintainer.",
    "",
    `Requested window: ${window}`,
    `Requested focus: ${focus}`,
    `Approved input scope: ${inputScope.join(", ")}`,
    "",
    "Return structured JSON only.",
    "",
    "Read-only context:",
    asPrettyJson(inputs)
  ].join("\n");
}
