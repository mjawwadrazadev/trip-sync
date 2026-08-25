import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Payment } from "@/models";
import { logChanges } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const customer_id = searchParams.get("customer_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (customer_id) filter.customer_id = customer_id;

    const [payments, total] = await Promise.all([
      Payment.find(filter).populate("customer_id", "name").sort({ created_at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Payment.countDocuments(filter),
    ]);

    return successResponse({ payments, total, page, pages: Math.ceil(total / limit) });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();
    const { customer_id, amount, currency, payment_method } = body;

    if (!customer_id || !amount || !payment_method) {
      return errorResponse("customer_id, amount, and payment_method are required");
    }

    const payment = await Payment.create({
      tenant_id: user.tenant_id,
      customer_id,
      amount,
      currency: currency || "PKR",
      payment_method,
      status: "Posted",
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Payment", entity_id: payment._id, changed_by: user.user_id },
      null,
      payment.toObject()
    );

    return successResponse({ payment }, 201);
  }, ["Owner", "Accountant"]);
}
