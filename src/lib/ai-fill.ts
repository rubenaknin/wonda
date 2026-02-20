import type { CompanyProfile, Competitor, IntelligenceBankQuestion } from "@/types"

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

function generateMockCompetitors(domain: string): Competitor[] {
  const namePart = domain.split(".")[0] ?? "company"
  const tld = domain.split(".").slice(1).join(".") || "com"

  const prefixes = ["better", "smart", "pro", "fast", "easy"]
  const suffixes = ["hub", "suite", "cloud", "io", "app"]

  return Array.from({ length: 5 }, (_, i) => {
    const compName =
      i < prefixes.length
        ? `${prefixes[i].charAt(0).toUpperCase() + prefixes[i].slice(1)}${namePart.charAt(0).toUpperCase() + namePart.slice(1)}`
        : `${namePart}${suffixes[i % suffixes.length]}`
    const compDomain = `${compName.toLowerCase()}.${tld}`
    return {
      id: crypto.randomUUID(),
      name: compName,
      url: compDomain,
    }
  })
}

function generateMockQuestions(name: string): IntelligenceBankQuestion[] {
  const templates = [
    `What makes ${name} different from competitors?`,
    `How does ${name} help businesses grow?`,
    `What are the key features of ${name}?`,
    `How much does ${name} cost?`,
    `Is ${name} suitable for small businesses?`,
    `What integrations does ${name} support?`,
    `How does ${name} compare to other solutions?`,
    `What results can I expect from ${name}?`,
    `Does ${name} offer a free trial?`,
    `How do I get started with ${name}?`,
    `What kind of support does ${name} provide?`,
    `Can ${name} handle enterprise-level needs?`,
    `What are the best alternatives to ${name}?`,
    `How does ${name} improve SEO performance?`,
    `What industries does ${name} serve?`,
  ]
  return templates.map((text) => ({
    id: crypto.randomUUID(),
    text,
    enabled: true,
  }))
}

export function aiFillFromDomain(domain: string): Partial<CompanyProfile> {
  const namePart = domain.split(".")[0] ?? "Company"
  const name = namePart.charAt(0).toUpperCase() + namePart.slice(1)
  const website = `https://${domain}`

  return {
    name,
    description: `${name} provides innovative solutions that help businesses grow and succeed in their market. Our platform combines cutting-edge technology with intuitive design.`,
    valueProp: `${name} is the only platform that combines AI-powered automation with real-time analytics, helping teams achieve 3x better results.`,
    websiteUrl: website,
    sitemapUrl: `${website}/sitemap.xml`,
    contentSitemapUrls: [`${website}/blog-sitemap.xml`],
    contentPaths: ["/blog"],
    ctaText: "Start Free Trial",
    ctaUrl: `${website}/trial`,
    competitors: generateMockCompetitors(domain),
    intelligenceBank: generateMockQuestions(name),
  }
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
