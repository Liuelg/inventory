import { useEffect } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom"

import { AppSidebarLayout } from "@/layout/app-sidebar-layout.tsx"
import { AuthLayout } from "@/layout/auth-layout.tsx"
import { authClient } from "@/lib/auth-client.ts"
import { CategoryPage } from "@/features/categories/pages/CategoryPage.tsx"
import { Home } from "@/pages/Home.tsx"
import { LoginPage } from "@/pages/login.tsx"
import { NotFound } from "@/pages/NotFound.tsx"
import { SignupPage } from "@/pages/signup.tsx"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !session) {
      navigate("/login", { replace: true })
    }
  }, [isPending, session, navigate])

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    )
  }

  return session ? <>{children}</> : null
}

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && session) {
      navigate("/", { replace: true })
    }
  }, [isPending, session, navigate])

  if (isPending) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    )
  }

  return !session ? <>{children}</> : null
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfAuthed>
                <SignupPage />
              </RedirectIfAuthed>
            }
          />
        </Route>
        <Route
          element={
            <RequireAuth>
              <AppSidebarLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/category" element={<CategoryPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
