import { useNavigate } from "react-router-dom"
import { Outlet } from "react-router-dom"
import { Settings } from "lucide-react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { AppSidebar } from "./AppSidebar"
import { ROUTES } from "@/lib/constants"

export function AppLayout() {
  const navigate = useNavigate()

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(ROUTES.SETTINGS)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
