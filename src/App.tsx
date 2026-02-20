import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import { WebhookProvider } from "@/context/WebhookContext"
import { CompanyProfileProvider } from "@/context/CompanyProfileContext"
import { ArticlesProvider } from "@/context/ArticlesContext"
import { ChatProvider } from "@/context/ChatContext"
import { PlanProvider } from "@/context/PlanContext"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AppLayout } from "@/components/layout/AppLayout"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { DashboardPage } from "@/pages/DashboardPage"
import { CompanyProfilePage } from "@/pages/CompanyProfilePage"
import { ContentLibraryPage } from "@/pages/ContentLibraryPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { LoginPage } from "@/pages/LoginPage"
import { VerifyEmailPage } from "@/pages/VerifyEmailPage"
import { OnboardingPage } from "@/pages/OnboardingPage"
import { AdminPage } from "@/pages/AdminPage"
import { AdminUserViewPage } from "@/pages/AdminUserViewPage"
import { ROUTES } from "@/lib/constants"

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmailPage />,
  },
  {
    path: "/onboarding",
    element: <OnboardingPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
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
      {
        path: "admin",
        element: (
          <ProtectedRoute requireAdmin>
            <AdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/user/:uid",
        element: (
          <ProtectedRoute requireAdmin>
            <AdminUserViewPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
])

function AppProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const uid = user?.uid

  return (
    <WebhookProvider uid={uid}>
      <CompanyProfileProvider uid={uid}>
        <PlanProvider
          uid={uid}
          trialStartDate={user?.trialStartDate}
          planTier={user?.planTier}
          articlesUsedRemote={user?.articlesUsed}
        >
          <ArticlesProvider uid={uid}>
            <ChatProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </ChatProvider>
          </ArticlesProvider>
        </PlanProvider>
      </CompanyProfileProvider>
    </WebhookProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppProviders>
        <RouterProvider router={router} />
        <Toaster />
      </AppProviders>
    </AuthProvider>
  )
}

export default App
