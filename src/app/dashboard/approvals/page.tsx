"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">Approvals</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Review and manage pending approval requests</p>
      </div>
      <Card className="bg-white dark:bg-[#111113] border-gray-200/80 dark:border-[#1e1e21] shadow-sm">
        <CardHeader className="px-6 pt-5 pb-3"><CardTitle className="text-[15px] font-semibold text-gray-900 dark:text-gray-50">Pending Approvals</CardTitle></CardHeader>
        <CardContent className="px-6 pb-5">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-7 w-7 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-1">All caught up!</p>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 max-w-sm">
              Approval requests are created automatically when a credit limit is exceeded or when an expense type requires approval.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                Credit Limit Overrides
              </div>
              <div className="h-3 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2 text-[12px] text-gray-400">
                <Clock className="h-3.5 w-3.5" />
                Expense Approvals
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
