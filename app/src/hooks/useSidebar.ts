import type { LucideIcon } from "lucide-react"
import { Building2, HomeIcon, ListIcon, Package, ShoppingCart, Truck } from "lucide-react"
import { useLocation } from "react-router-dom"

export type SidebarNavItem = {
  title: string
  to: string
  icon: LucideIcon
  tooltip: string
  /** Match pathname exactly; when false/undefined, prefix match is used */
  end?: boolean
}

const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { title: "Home", to: "/", icon: HomeIcon, tooltip: "Home", end: true },
  {
    title: "Category",
    to: "/category",
    icon: ListIcon,
    tooltip: "Category",
  },
  {
    title: "Products",
    to: "/products",
    icon: Package,
    tooltip: "Products",
  },
  {
    title: "Stores",
    to: "/stores",
    icon: Building2,
    tooltip: "Stores",
  },
  {
    title: "Sales",
    to: "/sales",
    icon: ShoppingCart,
    tooltip: "Sales",
  },
  {
    title: "Stock In",
    to: "/good-ins",
    icon: Truck,
    tooltip: "Stock In",
  },
]

export type SidebarNavItemResolved = SidebarNavItem & { isActive: boolean }

export function useSidebarNavItems(): SidebarNavItemResolved[] {
  const { pathname } = useLocation()

  return SIDEBAR_NAV_ITEMS.map((item) => ({
    ...item,
    isActive: item.end
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`),
  }))
}
