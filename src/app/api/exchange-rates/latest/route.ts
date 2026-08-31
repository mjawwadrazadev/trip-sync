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

    let rate = await ExchangeRate.findOne({ from_currency: from, to_currency: to })
      .sort({ fetched_at: -1 });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (!rate || rate.fetched_at < oneDayAgo) {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${from}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedRate = data.rates?.[to];
          if (fetchedRate !== undefined) {
            rate = await ExchangeRate.create({
              from_currency: from,
              to_currency: to,
              rate: fetchedRate,
              fetched_at: new Date(),
              source: "open.er-api.com",
            });
          }
        }
      } catch (err) {
        console.error("Exchange rate fetch error:", err);
      }
    }

    if (!rate) return errorResponse("Exchange rate not found", 404);

    return successResponse({ exchange_rate: rate });
  });
}
