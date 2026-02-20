import type { CompanyProfile } from "@/types"

const MOCK_VALUES: Record<string, string> = {
  name: "Acme Corp",
  description:
    "Leading provider of cloud-based marketing solutions that help businesses scale their digital presence through AI-powered content generation and real-time analytics.",
  valueProp:
    "The only platform that combines AI-powered content generation with real-time SEO analytics, delivering 3x more organic traffic in half the time.",
  ctaText: "Start Free Trial",
  ctaUrl: "https://acme.com/trial",
  websiteUrl: "https://acme.com",
  sitemapUrl: "https://acme.com/sitemap.xml",
}

export function aiFillField(
  fieldName: string,
  _context: CompanyProfile
): string {
  return MOCK_VALUES[fieldName] ?? ""
}

export function aiFillAll(
  profile: CompanyProfile
): Partial<CompanyProfile> {
  const updates: Partial<CompanyProfile> = {}
  for (const [key, mockValue] of Object.entries(MOCK_VALUES)) {
    const current = profile[key as keyof CompanyProfile]
    if (typeof current === "string" && current.trim() === "") {
      ;(updates as Record<string, string>)[key] = mockValue
    }
  }
  if (profile.contentSitemapUrls.length === 0) {
    updates.contentSitemapUrls = ["https://acme.com/blog-sitemap.xml"]
  }
  if (profile.contentPaths.length === 0) {
    updates.contentPaths = ["/blog", "/learn"]
  }
  return updates
}
