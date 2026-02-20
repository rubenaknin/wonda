import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"

const SEO_TERMS: Record<string, string> = {
  slug: "A URL-friendly version of the title, used in the article's web address.",
  cannibalization:
    "When multiple pages on your site compete for the same keyword, diluting rankings.",
  aeo: "Answer Engine Optimization — structuring content so AI assistants can cite it as a source.",
  "internal links":
    "Links from one page on your site to another, helping search engines understand your site structure.",
  "meta title":
    "The title tag shown in search results. Keep it under 60 characters for best display.",
  "meta description":
    "A short summary shown below the title in search results. Keep it under 160 characters.",
  keyword:
    "The primary search term you want this article to rank for in search engines.",
  cta: "Call to Action — the button or link that prompts users to take a desired action.",
}

interface SeoTooltipProps {
  term: string
  children?: React.ReactNode
}

export function SeoTooltip({ term, children }: SeoTooltipProps) {
  const description = SEO_TERMS[term.toLowerCase()] ?? term

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1 cursor-help">
          {children ?? term}
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm">
        {description}
      </TooltipContent>
    </Tooltip>
  )
}
