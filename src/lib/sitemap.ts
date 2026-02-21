import type { Article } from "@/types"

interface SitemapArticle {
  url: string
  slug: string
  title: string
  contentPath: string
}

export async function parseSitemapUrls(contentSitemapUrls: string[]): Promise<Article[]> {
  const articles: Article[] = []
  const now = new Date().toISOString()

  for (const sitemapUrl of contentSitemapUrls) {
    try {
      const res = await fetch("/api/sitemap-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sitemapUrl }),
      })

      if (!res.ok) continue

      const data: { articles: SitemapArticle[]; totalUrls: number } = await res.json()

      for (const item of data.articles) {
        articles.push({
          id: crypto.randomUUID(),
          title: item.title,
          slug: item.slug,
          keyword: item.slug.split("-").slice(0, 3).join(" "),
          category: "blog",
          status: "published",
          bodyHtml: "",
          faqHtml: "",
          faqItems: [],
          metaTitle: item.title,
          metaDescription: "",
          ctaText: "",
          ctaUrl: "",
          internalLinks: [],
          selectedQuestions: [],
          createdAt: now,
          updatedAt: now,
          origin: "existing",
          source: "sitemap",
          contentPath: item.contentPath,
        })
      }
    } catch {
      continue
    }
  }

  return articles
}
