import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { WebhookProvider } from "@/context/WebhookContext"
import { CompanyProfileProvider } from "@/context/CompanyProfileContext"
import { ArticlesProvider } from "@/context/ArticlesContext"
import { PlanProvider } from "@/context/PlanContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppLayout } from "@/components/layout/AppLayout"
import { DashboardPage } from "@/pages/DashboardPage"
import { CompanyProfilePage } from "@/pages/CompanyProfilePage"
import { ContentLibraryPage } from "@/pages/ContentLibraryPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { ROUTES } from "@/lib/constants"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: ROUTES.COMPANY_PROFILE.slice(1),
        element: <CompanyProfilePage />,
      },
      {
        path: ROUTES.CONTENT_LIBRARY.slice(1),
        element: <ContentLibraryPage />,
      },
      { path: ROUTES.SETTINGS.slice(1), element: <SettingsPage /> },
    ],
  },
])

function App() {
  return (
    <WebhookProvider>
      <CompanyProfileProvider>
        <PlanProvider>
          <ArticlesProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
              <Toaster />
            </TooltipProvider>
          </ArticlesProvider>
        </PlanProvider>
      </CompanyProfileProvider>
    </WebhookProvider>
  )
}

export default App
