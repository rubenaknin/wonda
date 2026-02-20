import { FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onCreateArticle: () => void
}

export function EmptyState({ onCreateArticle }: EmptyStateProps) {
  return (
    <Card className="wonda-card p-12 flex flex-col items-center justify-center text-center">
      <div className="p-3 rounded-full bg-[#F8FAFC] mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-muted-foreground">
        No content yet
      </h3>
      <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-md">
        Generated articles will appear here. Create your first piece to get
        started with SEO-optimized content.
      </p>
      <Button onClick={onCreateArticle}>Create Your First Article</Button>
    </Card>
  )
}
