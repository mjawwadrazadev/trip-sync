import { NextRequest, NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/super-admin";
import { Tenant } from "@/models";

// POST /api/admin/agencies/[id]/toggle - Suspend or activate agency
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSuperAdmin(async () => {
    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "suspend" | "activate"

    if (!["suspend", "activate"].includes(action)) {
      return NextResponse.json({ error: "action must be 'suspend' or 'activate'" }, { status: 400 });
    }

    const agency = await Tenant.findById(id);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    agency.status = action === "suspend" ? "Suspended" : "Active";
    await agency.save();

    return NextResponse.json({ agency, message: `Agency ${action}d successfully` });
  });
}
