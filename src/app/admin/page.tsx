"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, AlertTriangle, CheckCircle } from "lucide-react";

interface Stats {
  total: number;
  active: number;
  expired: number;
  suspended: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/agencies").then((r) => r.json()).then((data) => {
      const agencies = data.agencies || [];
      setStats({
        total: agencies.length,
        active: agencies.filter((a: Record<string, unknown>) => a.status === "Active" && !a.is_expired).length,
        expired: agencies.filter((a: Record<string, unknown>) => a.is_expired || a.status === "Expired").length,
        suspended: agencies.filter((a: Record<string, unknown>) => a.status === "Suspended").length,
      });
    });
  }, []);

  const cards = [
    { title: "Total Agencies", value: stats?.total ?? "-", icon: Building2, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-500/10" },
    { title: "Active", value: stats?.active ?? "-", icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/10" },
    { title: "Expired", value: stats?.expired ?? "-", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/10" },
    { title: "Suspended", value: stats?.suspended ?? "-", icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-500/10" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Platform Overview</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Manage all agencies on the TripSync platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{card.title}</p>
                    <p className="text-3xl font-bold tracking-tight mt-2 text-gray-900 dark:text-gray-50">{card.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${card.color}`} strokeWidth={1.8} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
