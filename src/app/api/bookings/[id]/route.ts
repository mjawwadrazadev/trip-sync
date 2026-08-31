import { NextRequest } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-helpers";
import { Booking, Supplier } from "@/models";
import { logChanges } from "@/lib/audit";

// GET /api/bookings/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const booking = await Booking.findOne({ _id: id, tenant_id: user.tenant_id })
      .populate("customer_id", "name email phone")
      .populate("supplier_id", "name code currency")
      .lean();
    if (!booking) return errorResponse("Booking not found", 404);
    return successResponse({ booking });
  });
}

// PATCH /api/bookings/[id] — update booking details and supplier balance
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(async (user) => {
    const { id } = await params;
    const booking = await Booking.findOne({ _id: id, tenant_id: user.tenant_id });
    if (!booking) return errorResponse("Booking not found", 404);

    const body = await req.json();
    const oldDoc = booking.toObject();

    const allowed = [
      "status", "gds_pnr", "passenger_details", "itinerary_details",
      "total_cost", "total_price", "supplier_id",
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        booking[key] = body[key];
      }
    }

    if (body.total_price !== undefined || body.total_cost !== undefined) {
      booking.margin = booking.total_price - booking.total_cost;
    }

    booking.updated_by = user.user_id;
    await booking.save();

    // Supplier balance adjustments
    const oldCost = oldDoc.total_cost;
    const newCost = booking.total_cost;
    const oldStatus = oldDoc.status;
    const newStatus = booking.status;

    const oldActive = oldStatus === "Confirmed" || oldStatus === "Ticketed";
    const newActive = newStatus === "Confirmed" || newStatus === "Ticketed";

    let balanceDiff = 0;
    if (oldActive && newActive) {
      balanceDiff = newCost - oldCost;
    } else if (!oldActive && newActive) {
      balanceDiff = newCost;
    } else if (oldActive && !newActive) {
      balanceDiff = -oldCost;
    }

    if (balanceDiff !== 0) {
      const supplier = await Supplier.findOne({ _id: booking.supplier_id, tenant_id: user.tenant_id });
      if (supplier) {
        supplier.current_balance += balanceDiff;
        await supplier.save();
      }
    }

    await logChanges(
      { tenant_id: user.tenant_id, entity_type: "Booking", entity_id: booking._id, changed_by: user.user_id },
      oldDoc,
      booking.toObject()
    );

    return successResponse({ booking });
  });
}