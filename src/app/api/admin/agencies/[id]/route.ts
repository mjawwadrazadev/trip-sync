import { NextRequest, NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/super-admin";
import { Tenant, User } from "@/models";

// GET /api/admin/agencies/[id] - Get agency details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSuperAdmin(async () => {
    const { id } = await params;
    const agency = await Tenant.findById(id).lean();
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    const users = await User.find({ tenant_id: id }).select("name email role created_at").lean();

    return NextResponse.json({
      agency: {
        ...agency,
        is_expired: agency.access_expires_at ? new Date(agency.access_expires_at) < new Date() : false,
      },
      users,
    });
  });
}

// PATCH /api/admin/agencies/[id] - Update agency
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSuperAdmin(async () => {
    const { id } = await params;
    const body = await req.json();

    const agency = await Tenant.findById(id);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    // Updatable fields
    const allowed = ["name", "status", "access_expires_at", "max_users", "base_currency", "invoice_prefix", "contact_person", "contact_email", "contact_phone", "notes"];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        (agency as Record<string, unknown>)[key] = body[key];
      }
    }

    await agency.save();
    return NextResponse.json({ agency });
  });
}
