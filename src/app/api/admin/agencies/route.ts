import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { withSuperAdmin } from "@/lib/super-admin";
import { Tenant, User } from "@/models";

// GET /api/admin/agencies - List all agencies
export async function GET() {
  return withSuperAdmin(async () => {
    const agencies = await Tenant.find().sort({ created_at: -1 }).lean();

    // Get user count per agency
    const result = await Promise.all(
      agencies.map(async (agency) => {
        const userCount = await User.countDocuments({ tenant_id: agency._id });
        const owner = await User.findOne({ tenant_id: agency._id, role: "Owner" }).select("name email").lean();
        return {
          ...agency,
          user_count: userCount,
          owner: owner || null,
          is_expired: agency.access_expires_at ? new Date(agency.access_expires_at) < new Date() : false,
        };
      })
    );

    return NextResponse.json({ agencies: result });
  });
}

// POST /api/admin/agencies - Create new agency with owner account
export async function POST(req: NextRequest) {
  return withSuperAdmin(async () => {
    const body = await req.json();
    const {
      agency_name,
      invoice_prefix,
      base_currency,
      max_users,
      access_days,
      contact_person,
      contact_email,
      contact_phone,
      owner_name,
      owner_email,
      owner_password,
      notes,
    } = body;

    if (!agency_name || !owner_name || !owner_email || !owner_password) {
      return NextResponse.json(
        { error: "agency_name, owner_name, owner_email, and owner_password are required" },
        { status: 400 }
      );
    }

    // Check if owner email already exists
    const existingUser = await User.findOne({ email: owner_email });
    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Calculate expiry
    let access_expires_at = null;
    if (access_days) {
      access_expires_at = new Date();
      access_expires_at.setDate(access_expires_at.getDate() + parseInt(access_days));
    }

    // Create tenant
    const tenant = await Tenant.create({
      name: agency_name,
      invoice_prefix: invoice_prefix || "INV",
      base_currency: base_currency || "PKR",
      status: "Active",
      access_expires_at,
      max_users: max_users || 10,
      contact_person: contact_person || "",
      contact_email: contact_email || "",
      contact_phone: contact_phone || "",
      notes: notes || "",
    });

    // Create owner account
    const hashedPassword = await bcrypt.hash(owner_password, 10);
    const owner = await User.create({
      tenant_id: tenant._id,
      name: owner_name,
      email: owner_email,
      password: hashedPassword,
      role: "Owner",
    });

    return NextResponse.json(
      {
        agency: tenant,
        owner: { id: owner._id, name: owner.name, email: owner.email },
        credentials: { email: owner_email, password: owner_password },
      },
      { status: 201 }
    );
  });
}
