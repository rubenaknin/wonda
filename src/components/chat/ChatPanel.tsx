import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useChat } from "@/context/ChatContext"
import { ChatMessage } from "./ChatMessage"
import { ChatTypingIndicator } from "./ChatTypingIndicator"
import { ChatInput } from "./ChatInput"
import { cn } from "@/lib/utils"

interface ChatPanelProps {
  variant: "sidebar" | "floating"
  onClose?: () => void
}

export function ChatPanel({ variant, onClose }: ChatPanelProps) {
  const { messages, isProcessing, sendMessage, handleButtonClick } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isProcessing])

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        variant === "sidebar"
          ? "h-full border-r border-border"
          : "h-full rounded-t-xl"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium">Wonda Assistant</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <p className="font-medium">Hi! I'm your Wonda Assistant.</p>
              <p className="mt-1">
                I can help you create articles, edit content, and manage your library. Type "help" to see what I can do.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onButtonClick={handleButtonClick}
            />
          ))}
          {isProcessing && <ChatTypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isProcessing} />
    </div>
  )
}
