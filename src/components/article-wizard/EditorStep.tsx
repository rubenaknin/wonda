import { useState } from "react"
import { Plus, Trash2, Loader2, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "./RichTextEditor"
import { applyAiEdit } from "@/lib/ai-edit"
import type { FaqItem } from "@/types"

interface EditorStepProps {
  bodyHtml: string
  faqHtml: string
  faqItems: FaqItem[]
  onUpdateBody: (html: string) => void
  onUpdateFaq: (html: string) => void
  onUpdateFaqItem: (id: string, field: "question" | "answer", value: string) => void
  onAddFaqItem: () => void
  onRemoveFaqItem: (id: string) => void
}

export function EditorStep({
  bodyHtml,
  faqItems,
  onUpdateBody,
  onUpdateFaqItem,
  onAddFaqItem,
  onRemoveFaqItem,
}: EditorStepProps) {
  const [aiOpen, setAiOpen] = useState(false)
  const [aiInstructions, setAiInstructions] = useState("")
  const [aiLoading, setAiLoading] = useState(false)

  const handleAiEdit = async () => {
    if (!aiInstructions.trim() || aiLoading) return
    setAiLoading(true)
    try {
      const result = await applyAiEdit(aiInstructions, bodyHtml)
      onUpdateBody(result)
      setAiInstructions("")
      setAiOpen(false)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="body" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="body" className="flex-1">
            Article Body
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex-1">
            FAQ Section ({faqItems.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="body" className="mt-4">
          <div className="relative">
            <RichTextEditor
              value={bodyHtml}
              onChange={onUpdateBody}
              placeholder="Write your article content..."
              minHeight="400px"
            />
            {/* Floating AI Edit button */}
            <Button
              size="sm"
              className="absolute top-2 right-2 h-8 gap-1.5 bg-[#0061FF] hover:bg-[#0061FF]/90 text-white shadow-md z-10"
              onClick={() => setAiOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Edit
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="faq" className="mt-4 space-y-4">
          {faqItems.length > 0 ? (
            <Accordion type="multiple" className="space-y-2">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="wonda-card border-border px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="text-sm font-medium text-left flex-1 mr-2">
                      {item.question || `Question ${index + 1}`}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        Question
                      </label>
                      <Input
                        value={item.question}
                        onChange={(e) =>
                          onUpdateFaqItem(item.id, "question", e.target.value)
                        }
                        placeholder="Enter the question..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">
                        Answer
                      </label>
                      <Textarea
                        value={item.answer}
                        onChange={(e) =>
                          onUpdateFaqItem(item.id, "answer", e.target.value)
                        }
                        placeholder="Enter the answer..."
                        rows={3}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemoveFaqItem(item.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No FAQ items yet. Add one below.
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onAddFaqItem}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add FAQ Item
          </Button>
        </TabsContent>
      </Tabs>

      {/* AI Edit Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0061FF]" />
              Edit with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Describe how you'd like to modify the article... e.g., 'Make the tone more casual' or 'Add a section about pricing'"
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAiOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAiEdit}
                disabled={!aiInstructions.trim() || aiLoading}
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply Changes"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
