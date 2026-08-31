import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Supplier } from "@/models";
import { logChanges } from "@/lib/audit";

// GET /api/suppliers — list all suppliers
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter),
    ]);

    return successResponse({ suppliers, total, page, pages: Math.ceil(total / limit) });
  });
}

// POST /api/suppliers — create a new supplier
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();
    const { name, code, currency, contact_email, contact_phone } = body;

    if (!name) return errorResponse("Supplier name is required");

    const supplier = await Supplier.create({
      tenant_id: user.tenant_id,
      name,
      code: code || "",
      currency: currency || "PKR",
      contact_email: contact_email || "",
      contact_phone: contact_phone || "",
      current_balance: 0,
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Supplier", entity_id: supplier._id, changed_by: user.user_id },
      null,
      supplier.toObject()
    );

    return successResponse({ supplier }, 201);
  }, ["Owner", "Accountant"]);
}