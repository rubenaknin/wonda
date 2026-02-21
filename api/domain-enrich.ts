import type { VercelRequest, VercelResponse } from "@vercel/node"
import Anthropic from "@anthropic-ai/sdk"

const SYSTEM_PROMPT = `You are a business intelligence analyst. You will be given a company domain and the actual HTML content scraped from their website. Analyze both to return accurate structured data about the company.

Return a JSON object with exactly these fields:
- name: string — The company name (extract from the website content, not guessed from domain)
- description: string — A 1-2 sentence description of what the company actually does, based on the website content
- valueProp: string — A compelling value proposition sentence derived from their actual messaging
- ctaText: string — The primary CTA text found on their site (e.g. "Start Free Trial", "Get Started", "Book a Demo")
- ctaUrl: string — The CTA URL (use the actual link from the site if found, otherwise construct one)
- competitors: array of 5 objects, each with "name" (string) and "url" (string) — Real competitors in the same space based on what the company actually does. Use actual company names and domains.
- intelligenceBank: array of 15 strings — Questions that the company's target audience would search for, relevant to their actual industry and product. Make them specific and SEO-relevant.

Important:
- Base your analysis primarily on the ACTUAL website content provided, not assumptions from the domain name
- Use your knowledge to identify REAL competitors, not made-up names
- Questions should be specific to the company's industry, not generic
- All URLs should be properly formatted domains (no https:// prefix for competitor urls)
- Return ONLY valid JSON, no markdown fences or extra text`

async function fetchWebsiteContent(domain: string): Promise<string> {
  const urls = [
    `https://${domain}`,
    `https://www.${domain}`,
  ]

  for (const url of urls) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WondaBot/1.0)",
          "Accept": "text/html",
        },
        redirect: "follow",
      })

      clearTimeout(timeout)

      if (!res.ok) continue

      const html = await res.text()

      // Extract useful text: title, meta description, headings, and visible text
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || ""
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || ""
      const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i)?.[1]?.trim() || ""

      // Extract heading text
      const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, "").trim())
        .filter(Boolean)
        .slice(0, 20)

      // Extract link texts for CTAs
      const links = [...html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
        .map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, "").trim() }))
        .filter(l => l.text.length > 0 && l.text.length < 50)
        .slice(0, 30)

      // Extract paragraph text (first ~2000 chars of visible content)
      const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(m => m[1].replace(/<[^>]+>/g, "").trim())
        .filter(t => t.length > 20)
        .join(" ")
        .slice(0, 2000)

      // Compose a concise content summary for Claude
      const parts: string[] = []
      if (title) parts.push(`Page title: ${title}`)
      if (metaDesc) parts.push(`Meta description: ${metaDesc}`)
      if (ogDesc && ogDesc !== metaDesc) parts.push(`OG description: ${ogDesc}`)
      if (headings.length > 0) parts.push(`Headings: ${headings.join(" | ")}`)
      if (links.length > 0) {
        const ctaLinks = links.filter(l =>
          /start|try|demo|sign|get started|book|free|pricing/i.test(l.text)
        )
        if (ctaLinks.length > 0) {
          parts.push(`CTA links: ${ctaLinks.map(l => `"${l.text}" → ${l.href}`).join(", ")}`)
        }
      }
      if (paragraphs) parts.push(`Body text: ${paragraphs}`)

      return parts.join("\n\n")
    } catch {
      continue
    }
  }

  return ""
}

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

  // Fetch actual website content
  const siteContent = await fetchWebsiteContent(domain)

  const userMessage = siteContent
    ? `Analyze this domain: ${domain}\n\nHere is the actual content from their website:\n\n${siteContent}`
    : `Analyze this domain: ${domain}\n\n(Could not fetch website content — use your general knowledge about this company/domain.)`

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userMessage,
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
