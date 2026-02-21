import type { VercelRequest, VercelResponse } from "@vercel/node"
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `You are a business intelligence analyst. Given a company domain, analyze it and return structured data about the company.

Return a JSON object with exactly these fields:
- name: string — The company name (inferred from domain or known)
- description: string — A 1-2 sentence description of what the company does
- valueProp: string — A compelling value proposition sentence
- ctaText: string — A call-to-action button text (e.g. "Start Free Trial", "Get Started")
- ctaUrl: string — The CTA URL (e.g. https://domain/trial or /signup)
- competitors: array of 5 objects, each with "name" (string) and "url" (string) — Real competitors in the same space. Use actual company names and domains.
- intelligenceBank: array of 15 strings — Questions that the company's target audience would search for, relevant to their industry and product. Make them specific and SEO-relevant.

Important:
- Use your knowledge to identify REAL competitors, not made-up names
- Questions should be specific to the company's industry, not generic
- All URLs should be properly formatted domains (no https:// prefix for competitor urls)
- Return ONLY valid JSON, no markdown fences or extra text`

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" })
  }

  const { domain } = req.body ?? {}
  if (!domain || typeof domain !== "string") {
    return res.status(400).json({ error: "Missing domain field" })
  }

  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this domain: ${domain}`,
        },
      ],
    })

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    )

    if (!textBlock?.text) {
      return res.status(500).json({ error: "No response from AI" })
    }

    // Strip markdown code fences if present
    const raw = textBlock.text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "")
    const data = JSON.parse(raw)
    return res.status(200).json(data)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Domain enrichment failed"
    return res.status(500).json({ error: errMsg })
  }
}
