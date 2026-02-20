import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Article } from "@/types"

interface ArticlePreviewModalProps {
  article: Article | null
  open: boolean
  onClose: () => void
}

export function ArticlePreviewModal({
  article,
  open,
  onClose,
}: ArticlePreviewModalProps) {
  if (!article) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">
              Article Preview
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Rendered with blog styling &middot; {article.keyword}
          </p>
        </DialogHeader>

        {/* Blog-styled preview */}
        <div className="flex-1 overflow-auto">
          <div className="bg-white">
            {/* Simulated blog header bar */}
            <div className="bg-[#F8FAFC] border-b border-border px-8 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-5 w-5 rounded-full bg-border" />
                <span className="font-medium text-foreground">
                  {article.slug ? `yoursite.com/blog/${article.slug}` : "yoursite.com/blog"}
                </span>
              </div>
            </div>

            {/* Article content with blog CSS */}
            <article className="px-8 py-8 max-w-2xl mx-auto">
              {/* Category badge */}
              <div className="mb-4">
                <span className="text-xs font-medium uppercase tracking-wider text-[#0061FF]">
                  {(article.category || "blog").replace("-", " ")}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold tracking-tight leading-tight mb-4">
                {article.title || article.keyword}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-8 pb-6 border-b border-border">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0061FF]/20 to-[#0061FF]/5" />
                <div>
                  <p className="text-xs font-medium text-foreground">Content Team</p>
                  <p className="text-xs">
                    {new Date(article.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div
                className="prose prose-sm max-w-none
                  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4
                  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3
                  [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-5 [&_h3]:mb-2
                  [&_p]:text-sm [&_p]:leading-7 [&_p]:mb-4 [&_p]:text-gray-700
                  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
                  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
                  [&_li]:text-sm [&_li]:leading-7 [&_li]:text-gray-700 [&_li]:mb-1
                  [&_a]:text-[#0061FF] [&_a]:underline
                  [&_blockquote]:border-l-4 [&_blockquote]:border-[#0061FF]/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600
                  [&_.faq-item]:bg-[#F8FAFC] [&_.faq-item]:rounded-lg [&_.faq-item]:p-4 [&_.faq-item]:mb-3 [&_.faq-item]:border [&_.faq-item]:border-border
                  [&_.faq-item_h3]:text-sm [&_.faq-item_h3]:font-semibold [&_.faq-item_h3]:mb-1
                  [&_.faq-item_p]:text-sm [&_.faq-item_p]:text-gray-600 [&_.faq-item_p]:mb-0
                "
                dangerouslySetInnerHTML={{
                  __html: article.bodyHtml + (article.faqHtml || ""),
                }}
              />

              {/* CTA */}
              {article.ctaText && (
                <div className="mt-10 p-6 bg-gradient-to-br from-[#0061FF]/5 to-[#0061FF]/10 rounded-xl border border-[#0061FF]/20 text-center">
                  <p className="text-sm font-medium mb-3">Ready to get started?</p>
                  <div className="inline-block bg-[#0061FF] text-white text-sm font-medium px-6 py-2.5 rounded-lg">
                    {article.ctaText}
                  </div>
                </div>
              )}
            </article>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
