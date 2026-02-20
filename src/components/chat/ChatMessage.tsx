import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ChatMessage as ChatMessageType } from "@/lib/chat/types"

interface ChatMessageProps {
  message: ChatMessageType
  onButtonClick: (action: string, payload?: Record<string, string>) => void
}

export function ChatMessage({ message, onButtonClick }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <MessageText text={message.text} />
        {message.buttons && message.buttons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.buttons.map((btn) => (
              <Button
                key={btn.action + (btn.payload?.articleId ?? "")}
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 text-xs",
                  isUser
                    ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                    : "border-border"
                )}
                onClick={() => onButtonClick(btn.action, btn.payload)}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders markdown-lite text (bold, code, newlines) */
function MessageText({ text }: { text: string }) {
  // Split into paragraphs
  const parts = text.split("\n")
  return (
    <>
      {parts.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          <InlineMarkdown text={line} />
        </span>
      ))}
    </>
  )
}

function InlineMarkdown({ text }: { text: string }) {
  // Handle **bold** and `code`
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g
  const segments: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index))
    }
    if (match[2]) {
      segments.push(<strong key={match.index}>{match[2]}</strong>)
    } else if (match[3]) {
      segments.push(
        <code key={match.index} className="rounded bg-black/10 px-1 py-0.5 text-xs font-data">
          {match[3]}
        </code>
      )
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }

  return <>{segments}</>
}
