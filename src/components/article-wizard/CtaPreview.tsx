interface CtaPreviewProps {
  text: string
  url: string
}

export function CtaPreview({ text, url }: CtaPreviewProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        CTA Preview
      </h4>
      <div className="glass rounded-lg p-6 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Ready to get started?
        </p>
        <div className="inline-flex items-center justify-center rounded-md bg-purple-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition-colors">
          {text || "Book a Demo"}
        </div>
        <p className="text-xs text-muted-foreground break-all">
          {url || "https://yoursite.com"}
        </p>
      </div>
    </div>
  )
}
