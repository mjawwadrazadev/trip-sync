"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FileText,
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  CheckCircle,
  Landmark,
  BarChart3,
  LogOut,
  Settings,
  ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
  { href: "/dashboard/commissions", label: "Commissions", icon: TrendingUp },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/dashboard/tax-codes", label: "Tax Codes", icon: Landmark },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TS</span>
          </div>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  const user = session.user;
  const initials = user.name?.split(" ").map((n) => n[0]).join("") || "U";

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] dark:bg-[#0a0a0b]">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white dark:bg-[#111113] border-r border-gray-200/80 dark:border-[#1e1e21] flex flex-col fixed inset-y-0 left-0 z-30">
        {/* Logo */}
        <div className="px-5 h-16 flex items-center gap-2.5 border-b border-gray-200/80 dark:border-[#1e1e21]">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-sm tracking-tight">TS</span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-50">TripSync</h1>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Finance</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Menu</p>
          {navItems.slice(0, 1).map((item) => renderNavItem(item, pathname))}

          <div className="pt-4 pb-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Finance</p>
          </div>
          {navItems.slice(1, 5).map((item) => renderNavItem(item, pathname))}

          <div className="pt-4 pb-1">
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Management</p>
          </div>
          {navItems.slice(5).map((item) => renderNavItem(item, pathname))}
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 py-3 border-t border-gray-200/80 dark:border-[#1e1e21] flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Theme</span>
          <ThemeToggle />
        </div>

        {/* User */}
        <div className="px-3 py-3 border-t border-gray-200/80 dark:border-[#1e1e21]">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1a1a1d] transition-colors cursor-pointer">
              <Avatar className="h-9 w-9 ring-2 ring-gray-100 dark:ring-[#1e1e21]">
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-none truncate text-gray-900 dark:text-gray-100">{user.name}</p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium">{(user as Record<string, unknown>).role as string}</p>
              </div>
              <Settings className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[230px]">
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="gap-2.5 text-red-500 focus:text-red-500">
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-[1400px] mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function renderNavItem(item: (typeof navItems)[number], pathname: string) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  return (
    <Link
      key={item.href}
      href={item.href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
        isActive
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1d] hover:text-gray-900 dark:hover:text-gray-200"
      }`}
    >
      <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={isActive ? 2 : 1.7} />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />}
    </Link>
  );
}
