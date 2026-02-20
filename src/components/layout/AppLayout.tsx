import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"

function MainContent() {
  const { state } = useSidebar()
  const sidebarOpen = state === "expanded"

  return (
    <main className="flex-1 overflow-auto">
      {!sidebarOpen && (
        <div className="p-4 border-b border-border">
          <SidebarTrigger />
        </div>
      )}
      <div className="p-6 lg:p-8">
        <Outlet />
      </div>
    </main>
  )
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <MainContent />
      </div>
    </SidebarProvider>
  )
}
