/**
 * Mock AI edit function — simulates a 2s delay, returns modified HTML.
 * In production, this would call an LLM API to apply the instructions.
 */
export async function applyAiEdit(
  instructions: string,
  currentBody: string
): Promise<string> {
  await new Promise((r) => setTimeout(r, 2000))

  // Simple mock: wrap existing body with a comment indicating the edit was applied
  // In production this would actually use an LLM to rewrite content
  const note = `<!-- AI Edit applied: ${instructions} -->\n`
  return note + currentBody
}
