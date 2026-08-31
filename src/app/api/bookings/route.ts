import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Booking, Supplier } from "@/models";
import { logChanges } from "@/lib/audit";

// GET /api/bookings
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const customer_id = searchParams.get("customer_id");
    const supplier_id = searchParams.get("supplier_id");
    const service_type = searchParams.get("service_type");

    const filter: Record<string, unknown> = { tenant_id: user.tenant_id };
    if (status) filter.status = status;
    if (customer_id) filter.customer_id = customer_id;
    if (supplier_id) filter.supplier_id = supplier_id;
    if (service_type) filter.service_type = service_type;

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("customer_id", "name")
        .populate("supplier_id", "name code")
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Booking.countDocuments(filter),
    ]);

    return successResponse({ bookings, total, page, pages: Math.ceil(total / limit) });
  });
}

// POST /api/bookings
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    const body = await req.json();
    const {
      customer_id, supplier_id, service_type, status,
      gds_pnr, passenger_details, itinerary_details,
      total_cost, total_price,
    } = body;

    if (!customer_id || !supplier_id || !service_type || total_cost === undefined || total_price === undefined) {
      return errorResponse("customer_id, supplier_id, service_type, total_cost, and total_price are required");
    }

    // Check if supplier exists
    const supplier = await Supplier.findOne({ _id: supplier_id, tenant_id: user.tenant_id });
    if (!supplier) return errorResponse("Supplier not found", 404);

    // Generate sequential booking reference BK-000001
    const lastBooking = await Booking.findOne({ tenant_id: user.tenant_id })
      .sort({ created_at: -1 })
      .lean();

    let nextNum = 1;
    if (lastBooking && lastBooking.booking_reference) {
      const match = lastBooking.booking_reference.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const booking_reference = `BK-${String(nextNum).padStart(6, "0")}`;

    const margin = total_price - total_cost;

    const booking = await Booking.create({
      tenant_id: user.tenant_id,
      booking_reference,
      customer_id,
      supplier_id,
      service_type,
      status: status || "Draft",
      gds_pnr: gds_pnr || "",
      passenger_details: passenger_details || [],
      itinerary_details: itinerary_details || "",
      total_cost,
      total_price,
      margin,
      invoice_id: null,
      created_by: user.user_id,
      updated_by: user.user_id,
    });

    // If status is Confirmed or Ticketed, add cost to supplier balance
    if (booking.status === "Confirmed" || booking.status === "Ticketed") {
      supplier.current_balance += total_cost;
      await supplier.save();
    }

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Booking", entity_id: booking._id, changed_by: user.user_id },
      null,
      booking.toObject()
    );

    return successResponse({ booking }, 201);
  });
}