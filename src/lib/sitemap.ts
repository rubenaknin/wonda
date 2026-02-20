import type { Article, ArticleCategory } from "@/types"

const MOCK_SLUGS_BY_PATH: Record<string, string[]> = {
  "/blog": [
    "ultimate-guide-to-seo-in-2025",
    "how-to-increase-organic-traffic",
    "content-marketing-strategies-that-work",
    "understanding-search-intent",
    "technical-seo-checklist",
    "link-building-best-practices",
  ],
  "/learn": [
    "what-is-seo",
    "introduction-to-keyword-research",
    "on-page-seo-fundamentals",
    "how-search-engines-work",
    "seo-for-beginners",
  ],
}

const DEFAULT_SLUGS = [
  "getting-started-with-content-strategy",
  "how-to-optimize-meta-tags",
  "best-practices-for-internal-linking",
  "measuring-seo-success",
  "creating-high-quality-content",
  "local-seo-guide",
]

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function randomCategory(): ArticleCategory {
  const cats: ArticleCategory[] = ["blog", "how-to", "glossary", "landing-page", "comparison"]
  return cats[Math.floor(Math.random() * cats.length)]
}

export function parseSitemapUrls(contentPaths: string[]): Article[] {
  const articles: Article[] = []
  const now = new Date()

  for (const path of contentPaths) {
    const slugs = MOCK_SLUGS_BY_PATH[path] ?? DEFAULT_SLUGS.slice(0, 5 + Math.floor(Math.random() * 3))

    for (const slug of slugs) {
      const daysAgo = Math.floor(Math.random() * 90)
      const date = new Date(now.getTime() - daysAgo * 86400000)
      articles.push({
        id: crypto.randomUUID(),
        title: slugToTitle(slug),
        slug: `${path}/${slug}`.replace(/^\//, ""),
        keyword: slug.split("-").slice(0, 3).join(" "),
        category: randomCategory(),
        status: "published",
        bodyHtml: "",
        faqHtml: "",
        faqItems: [],
        metaTitle: slugToTitle(slug),
        metaDescription: `Learn about ${slugToTitle(slug).toLowerCase()} and how it can help your business.`,
        ctaText: "",
        ctaUrl: "",
        internalLinks: [],
        selectedQuestions: [],
        createdAt: date.toISOString(),
        updatedAt: date.toISOString(),
        source: "sitemap",
        contentPath: path,
      })
    }
  }

  return articles
}
