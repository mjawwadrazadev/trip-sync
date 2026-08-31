"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  Menu,
  UserCheck,
} from "lucide-react";

interface NavChild {
  href: string;
  label: string;
  type: string | null;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: FileText,
    children: [
      { href: "/dashboard/invoices", label: "All Invoices", type: null },
      { href: "/dashboard/invoices?type=Ticket", label: "Tickets", type: "Ticket" },
      { href: "/dashboard/invoices?type=Hotel", label: "Hotels", type: "Hotel" },
      { href: "/dashboard/invoices?type=Package", label: "Packages", type: "Package" },
      { href: "/dashboard/invoices?type=Umrah", label: "Umrah", type: "Umrah" },
      { href: "/dashboard/invoices?type=Visa", label: "Visas", type: "Visa" },
      { href: "/dashboard/invoices?type=Other", label: "Others", type: "Other" },
    ],
  },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt },
  { href: "/dashboard/commissions", label: "Commissions", icon: TrendingUp },
  { href: "/dashboard/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/dashboard/tax-codes", label: "Tax Codes", icon: Landmark },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/agents", label: "Team & Agents", icon: UserCheck },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  function renderSidebar() {
    return (
      <>
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
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <Suspense fallback={<div className="text-xs text-gray-400 px-3">Loading menu...</div>}>
            <SidebarNav pathname={pathname} />
          </Suspense>
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
      </>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8f9fb] dark:bg-[#0a0a0b]">
      {/* Mobile Header */}
      <header className="sticky top-0 z-20 flex lg:hidden items-center justify-between px-4 h-16 border-b border-gray-200/80 dark:border-[#1e1e21] bg-white dark:bg-[#111113] w-full">
        <div className="flex items-center gap-2.5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 text-gray-500 dark:text-gray-400" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0 border-none bg-transparent">
              <aside className="w-[260px] h-full bg-white dark:bg-[#111113] border-r border-gray-200/80 dark:border-[#1e1e21] flex flex-col">
                {renderSidebar()}
              </aside>
            </SheetContent>
          </Sheet>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-sm tracking-tight">TS</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-50">TripSync</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Desktop Sidebar */}
      <aside className="w-[260px] bg-white dark:bg-[#111113] border-r border-gray-200/80 dark:border-[#1e1e21] hidden lg:flex flex-col fixed inset-y-0 left-0 z-30">
        {renderSidebar()}
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-[260px] min-h-screen">
        <div className="max-w-[1400px] mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  return (
    <div className="flex-1 space-y-4">
      <div>
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Menu</p>
        <div className="space-y-0.5">
          {navItems.slice(0, 1).map((item) => renderNavItem(item, pathname, searchParams))}
        </div>
      </div>

      <div>
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Finance</p>
        <div className="space-y-0.5">
          {navItems.slice(1, 5).map((item) => renderNavItem(item, pathname, searchParams))}
        </div>
      </div>

      <div>
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Management</p>
        <div className="space-y-0.5">
          {navItems.slice(5).map((item) => renderNavItem(item, pathname, searchParams))}
        </div>
      </div>
    </div>
  );
}

function renderNavItem(item: (typeof navItems)[number], pathname: string, searchParams: { get: (key: string) => string | null }) {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const activeType = searchParams.get("type");

  return (
    <div key={item.href} className="space-y-1">
      <Link
        href={item.href}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
          isActive && !activeType && !item.children
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : isActive
            ? "bg-primary/5 text-gray-900 dark:text-gray-100"
            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1d] hover:text-gray-900 dark:hover:text-gray-200"
        }`}
      >
        <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={isActive ? 2 : 1.7} />
        <span>{item.label}</span>
        {isActive && !item.children && <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />}
      </Link>

      {item.children && isActive && (
        <div className="pl-6 space-y-1.5 mt-1.5 border-l border-gray-100 dark:border-[#1e1e21] ml-[21px]">
          {item.children.map((child) => {
            const isChildActive = child.type ? activeType === child.type : !activeType;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block py-1 px-3 text-[12px] font-medium rounded-lg transition-all ${
                  isChildActive
                    ? "text-gray-900 dark:text-gray-100 font-semibold bg-primary/5 dark:bg-primary/10"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
