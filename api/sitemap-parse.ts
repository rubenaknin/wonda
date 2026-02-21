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

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/xml, text/xml, text/html",
}

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

async function fetchXml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  const response = await fetch(url, {
    signal: controller.signal,
    headers: FETCH_HEADERS,
  })

  clearTimeout(timeout)

  if (!response.ok) {
    throw new Error(`Sitemap returned ${response.status}`)
  }

  return response.text()
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)].map((m) => m[1].trim())
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
    const xml = await fetchXml(sitemapUrl)
    const locs = extractLocs(xml)

    // Check if this is a sitemap index (contains <sitemap> tags)
    const isSitemapIndex = /<sitemap>/i.test(xml)

    let allUrls: string[] = []

    if (isSitemapIndex) {
      // Fetch each child sitemap in parallel
      const childResults = await Promise.allSettled(
        locs.map((childUrl) => fetchXml(childUrl).then(extractLocs))
      )
      for (const result of childResults) {
        if (result.status === "fulfilled") {
          allUrls.push(...result.value)
        }
      }
    } else {
      allUrls = locs
    }

    const articles = extractArticles(allUrls)

    return res.status(200).json({
      articles,
      totalUrls: allUrls.length,
    })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Sitemap fetch failed"
    return res.status(502).json({ error: errMsg })
  }
}
