import { Plus, Trash2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "./RichTextEditor"
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
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Article Editor</h3>
        <p className="text-sm text-muted-foreground">
          Review and edit the generated article content and FAQ section.
        </p>
      </div>

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
          <RichTextEditor
            value={bodyHtml}
            onChange={onUpdateBody}
            placeholder="Write your article content..."
            minHeight="350px"
          />
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
    </div>
  )
}
