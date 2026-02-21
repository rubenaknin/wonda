import type { VercelRequest, VercelResponse } from "@vercel/node"

const CONTENT_PATH_PATTERNS = [
  "/blog/",
  "/article/",
  "/articles/",
  "/learn/",
  "/resources/",
  "/news/",
  "/guides/",
  "/posts/",
  "/insights/",
  "/stories/",
  "/knowledge/",
  "/tutorials/",
  "/updates/",
]

function slugToTitle(slug: string): string {
  return slug
    .replace(/\.\w+$/, "") // strip file extensions
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function extractArticles(urls: string[]) {
  const articles: { url: string; slug: string; title: string; contentPath: string }[] = []

  for (const url of urls) {
    try {
      const parsed = new URL(url)
      const pathname = parsed.pathname

      const matchedPath = CONTENT_PATH_PATTERNS.find((p) => pathname.includes(p))
      if (!matchedPath) continue

      // Extract slug from last path segment
      const segments = pathname.split("/").filter(Boolean)
      const slug = segments[segments.length - 1] || ""
      if (!slug) continue

      // Find the content path prefix (everything up to and including the matched pattern directory)
      const pathIdx = pathname.indexOf(matchedPath)
      const contentPath = pathname.slice(0, pathIdx + matchedPath.length - 1) // strip trailing slash

      articles.push({
        url,
        slug,
        title: slugToTitle(slug),
        contentPath,
      })
    } catch {
      continue
    }
  }

  return articles
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { sitemapUrl } = req.body ?? {}
  if (!sitemapUrl || typeof sitemapUrl !== "string") {
    return res.status(400).json({ error: "Missing sitemapUrl field" })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(sitemapUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WondaBot/1.0)",
        Accept: "application/xml, text/xml",
      },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      return res.status(502).json({ error: `Sitemap returned ${response.status}` })
    }

    const xml = await response.text()

    // Extract all <loc> URLs from the XML
    const locMatches = [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)]
    const allUrls = locMatches.map((m) => m[1].trim())

    const articles = extractArticles(allUrls)

    return res.status(200).json({
      articles,
      totalUrls: allUrls.length,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Sitemap fetch failed"
    return res.status(500).json({ error: errMsg })
  }
}
