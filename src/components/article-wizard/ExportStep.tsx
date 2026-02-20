import { toast } from "sonner"
import { Upload, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWebhook } from "@/context/WebhookContext"
import { sendWebhook } from "@/lib/webhook"

interface ExportStepProps {
  title: string
  slug: string
  keyword: string
  bodyHtml: string
  metaTitle: string
  metaDescription: string
}

export function ExportStep({
  title,
  slug,
  keyword,
  bodyHtml,
  metaTitle,
  metaDescription,
}: ExportStepProps) {
  const { webhookUrls } = useWebhook()

  const handleExport = async () => {
    const result = await sendWebhook(webhookUrls.generateArticle, "export_sheets", {
      articles: [
        { title, slug, keyword, bodyHtml, metaTitle, metaDescription },
      ],
    })

    if (result.success) {
      toast.success("Exported to Google Sheets", {
        description: (
          <span className="flex items-center gap-1">
            View spreadsheet
            <ExternalLink className="h-3 w-3" />
            <span className="text-xs text-muted-foreground">(mock link)</span>
          </span>
        ),
        duration: 5000,
      })
    } else {
      toast.error(result.error ?? "Export failed")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Export</h3>
        <p className="text-sm text-muted-foreground">
          Your article is ready! Export it to Google Sheets or save and close.
        </p>
      </div>

      <div className="glass rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-500/20">
            <Check className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="font-medium">{title || "Untitled Article"}</p>
            <p className="text-sm text-muted-foreground">/{slug}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Keyword:</span>
            <p>{keyword}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Meta Title:</span>
            <p className="truncate">{metaTitle || "Not set"}</p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleExport}
        variant="outline"
        className="w-full"
        size="lg"
      >
        <Upload className="h-4 w-4 mr-2" />
        Export to Google Sheets
      </Button>
    </div>
  )
}
