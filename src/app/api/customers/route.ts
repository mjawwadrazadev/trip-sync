import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Customer } from "@/models";
import { logChanges } from "@/lib/audit";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (search) filter.name = { $regex: search, $options: "i" };

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      Customer.countDocuments(filter),
    ]);

    return successResponse({ customers, total, page, pages: Math.ceil(total / limit) });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();
    if (!body.name) return errorResponse("Name is required");

    const customer = await Customer.create({
      tenant_id: user.tenant_id,
      name: body.name,
      contact_info: body.contact_info || {},
      credit_limit: body.credit_limit ?? null,
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Customer", entity_id: customer._id, changed_by: user.user_id },
      null,
      customer.toObject()
    );

    return successResponse({ customer }, 201);
  });
}
