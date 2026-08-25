import { NextRequest, NextResponse } from "next/server";
import { withSuperAdmin } from "@/lib/super-admin";
import { Tenant } from "@/models";

// POST /api/admin/agencies/[id]/extend - Extend access
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withSuperAdmin(async () => {
    const { id } = await params;
    const body = await req.json();
    const { days } = body;

    if (!days || days <= 0) {
      return NextResponse.json({ error: "days must be a positive number" }, { status: 400 });
    }

    const agency = await Tenant.findById(id);
    if (!agency) return NextResponse.json({ error: "Agency not found" }, { status: 404 });

    // Extend from current expiry or from now, whichever is later
    const baseDate = agency.access_expires_at && new Date(agency.access_expires_at) > new Date()
      ? new Date(agency.access_expires_at)
      : new Date();

    const newExpiry = new Date(baseDate);
    newExpiry.setDate(newExpiry.getDate() + days);

    agency.access_expires_at = newExpiry;
    agency.status = "Active";
    await agency.save();

    return NextResponse.json({
      agency,
      message: `Access extended by ${days} days. New expiry: ${newExpiry.toISOString()}`,
    });
  });
}
