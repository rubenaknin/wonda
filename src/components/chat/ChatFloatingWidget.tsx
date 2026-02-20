import { MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChat } from "@/context/ChatContext"
import { ChatPanel } from "./ChatPanel"

export function ChatFloatingWidget() {
  const { floatingOpen, toggleFloating, setFloatingOpen, sidebarOpen } = useChat()

  // Don't show floating widget when sidebar chat is open
  if (sidebarOpen) return null

  return (
    <>
      {/* Popup panel */}
      {floatingOpen && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl">
          <ChatPanel variant="floating" onClose={() => setFloatingOpen(false)} />
        </div>
      )}

      {/* Floating bubble */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={toggleFloating}
      >
        {floatingOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </Button>
    </>
  )
}
