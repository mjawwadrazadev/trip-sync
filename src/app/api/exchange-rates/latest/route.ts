import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { ExchangeRate } from "@/models";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    void user; // tenant-scoped but rates are global
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) return errorResponse("from and to currency codes are required");

    const rate = await ExchangeRate.findOne({ from_currency: from, to_currency: to })
      .sort({ fetched_at: -1 })
      .lean();

    if (!rate) return errorResponse("Exchange rate not found", 404);

    return successResponse({ exchange_rate: rate });
  });
}
