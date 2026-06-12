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
import { useAuthSession } from "@/hooks/use-auth-session.ts"
import { getDefaultRouteForRole, type UserRole } from "@/hooks/useSidebar.ts"
import { CategoryPage } from "@/features/categories/pages/CategoryPage.tsx"
import { ProductPage } from "@/features/products/pages/ProductPage.tsx"
import { StorePage } from "@/features/stores/pages/StorePage.tsx"
import { StoreDetailPage } from "@/features/stores/pages/StoreDetailPage.tsx"
import { SalesPage } from "@/features/sales/pages/SalesPage.tsx"
import { GoodInPage } from "@/features/good-ins/pages/GoodInPage.tsx"
import { StockoutPage } from "@/features/stockouts/pages/StockoutPage.tsx"
import { MyStorePage } from "@/features/my-store/pages/MyStorePage.tsx"
import { Home } from "@/pages/Home.tsx"
import { LoginPage } from "@/pages/login.tsx"
import { NotFound } from "@/pages/NotFound.tsx"
import { AccountsPage } from "@/features/accounts/pages/AccountsPage.tsx"
import { ReportsPage } from "@/features/reports/pages/ReportsPage.tsx"

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useAuthSession()
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
  const { data: session, isPending } = useAuthSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && session) {
      const defaultRoute = getDefaultRouteForRole(session.role)
      navigate(defaultRoute, { replace: true })
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

function RequireRole({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: UserRole[]
}) {
  const { data: session } = useAuthSession()
  const navigate = useNavigate()
  const role = (session?.role as UserRole) || "stock"

  useEffect(() => {
    if (session && !allowedRoles.includes(role)) {
      const defaultRoute = getDefaultRouteForRole(role)
      navigate(defaultRoute, { replace: true })
    }
  }, [session, role, allowedRoles, navigate])

  if (!session || !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}

function RoleRedirect() {
  const { data: session } = useAuthSession()
  const defaultRoute = getDefaultRouteForRole(session?.role || "stock")
  return <Navigate to={defaultRoute} replace />
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

        </Route>
        <Route
          element={
            <RequireAuth>
              <AppSidebarLayout />
            </RequireAuth>
          }
        >
          {/* admin */}
          <Route
            path="/"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <Home />
              </RequireRole>
            }
          />
          <Route
            path="/accounts"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <AccountsPage />
              </RequireRole>
            }
          />

          {/* sales */}
          <Route
            path="/my-store"
            element={
              <RequireRole allowedRoles={["sales"]}>
                <MyStorePage />
              </RequireRole>
            }
          />
          <Route
            path="/sales"
            element={
              <RequireRole allowedRoles={["admin", "sales"]}>
                <SalesPage />
              </RequireRole>
            }
          />
          <Route
            path="/good-ins"
            element={
              <RequireRole allowedRoles={["admin", "sales"]}>
                <GoodInPage />
              </RequireRole>
            }
          />

          {/* admin + stock */}
          <Route
            path="/category"
            element={
              <RequireRole allowedRoles={["admin", "stock"]}>
                <CategoryPage />
              </RequireRole>
            }
          />
          <Route
            path="/products"
            element={
              <RequireRole allowedRoles={["admin", "stock"]}>
                <ProductPage />
              </RequireRole>
            }
          />
          <Route
            path="/stores"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <StorePage />
              </RequireRole>
            }
          />
          <Route
            path="/stores/:id"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <StoreDetailPage />
              </RequireRole>
            }
          />
          <Route
            path="/stockouts"
            element={
              <RequireRole allowedRoles={["admin", "stock"]}>
                <StockoutPage />
              </RequireRole>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireRole allowedRoles={["admin"]}>
                <ReportsPage />
              </RequireRole>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
