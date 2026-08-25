import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { TaxCode } from "@/models";

export async function GET() {
  return withAuth(async (user) => {
    const taxCodes = await TaxCode.find({ tenant_id: user.tenant_id }).sort({ code: 1 }).lean();
    return successResponse({ tax_codes: taxCodes });
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();
    const { code, category, rate } = body;

    if (!code || !category || rate === undefined) {
      return errorResponse("code, category, and rate are required");
    }

    const taxCode = await TaxCode.create({
      tenant_id: user.tenant_id,
      code,
      category,
      rate,
      active: true,
      created_by: user.user_id,
    });

    return successResponse({ tax_code: taxCode }, 201);
  }, ["Owner", "Accountant"]);
}
