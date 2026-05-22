import type { LucideIcon } from "lucide-react"
import {
  ArrowUpFromLine,
  Building2,
  HomeIcon,
  ListIcon,
  Package,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Warehouse,
} from "lucide-react"
import { useLocation } from "react-router-dom"
import { useAuthSession } from "./use-auth-session.ts"

export type UserRole = "admin" | "sales" | "stock"

export type SidebarNavItem = {
  title: string
  to: string
  icon: LucideIcon
  tooltip: string
  end?: boolean
  roles: UserRole[]
}

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  {
    title: "My Store",
    to: "/my-store",
    icon: Store,
    tooltip: "My Store",
    end: true,
    roles: ["sales"],
  },
  {
    title: "Home",
    to: "/",
    icon: HomeIcon,
    tooltip: "Home",
    end: true,
    roles: ["admin"],
  },
  {
    title: "Accounts",
    to: "/accounts",
    icon: Users,
    tooltip: "Accounts",
    roles: ["admin"],
  },
  {
    title: "Category",
    to: "/category",
    icon: ListIcon,
    tooltip: "Category",
    roles: ["admin", "stock"],
  },
  {
    title: "Products",
    to: "/products",
    icon: Package,
    tooltip: "Products",
    roles: ["admin", "stock"],
  },
  {
    title: "Stock",
    to: "/stock",
    icon: Warehouse,
    tooltip: "Central Stock",
    roles: ["admin", "stock"],
  },
  {
    title: "Stores",
    to: "/stores",
    icon: Building2,
    tooltip: "Stores",
    roles: ["admin", "stock"],
  },
  {
    title: "Sales",
    to: "/sales",
    icon: ShoppingCart,
    tooltip: "Sales",
    roles: ["admin", "sales"],
  },
  {
    title: "Stock In",
    to: "/good-ins",
    icon: Truck,
    tooltip: "Stock In",
    roles: ["admin", "sales"],
  },
  {
    title: "Stockout",
    to: "/stockouts",
    icon: ArrowUpFromLine,
    tooltip: "Stockout",
    roles: ["admin", "stock"],
  },
]

export type SidebarNavItemResolved = SidebarNavItem & { isActive: boolean }

export function useSidebarNavItems(): SidebarNavItemResolved[] {
  const { pathname } = useLocation()
  const { data: session } = useAuthSession()
  const role = (session?.role as UserRole) || "stock"

  const allowedItems = SIDEBAR_NAV_ITEMS.filter((item) =>
    item.roles.includes(role)
  )

  return allowedItems.map((item) => ({
    ...item,
    isActive: item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`),
  }))
}

export function getDefaultRouteForRole(role: UserRole | string): string {
  switch (role) {
    case "sales":
      return "/my-store"
    case "stock":
      return "/stock"
    case "admin":
    default:
      return "/"
  }
}
