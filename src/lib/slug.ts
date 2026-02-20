import type { Article } from "@/types"

export function generateSlug(keyword: string): string {
  return keyword
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function isSlugTaken(
  slug: string,
  articles: Article[],
  excludeId?: string
): boolean {
  return articles.some((a) => a.slug === slug && a.id !== excludeId)
}
