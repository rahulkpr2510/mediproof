import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Order quantity caps by role
const QUANTITY_CAPS: Record<string, number> = {
  DISTRIBUTOR: 1000,
  PHARMACY: 200,
};

const createOrderSchema = z.object({
  supplierId: z.string().min(1),
  batchId: z.string().min(1),
  quantity: z.number().int().min(1).max(10000),
});

// GET - List orders for current user
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get orders where user is buyer or supplier
    const orders = await prisma.order.findMany({
      where: {
        OR: [{ buyerId: user.id }, { supplierId: user.id }],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST - Create new order
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const buyer = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!buyer || buyer.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Not authorized to place orders" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = createOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { supplierId, batchId, quantity } = validated.data;

    // Check quantity cap for buyer's role
    const cap = QUANTITY_CAPS[buyer.role] || 1000;
    const isSpecialOrder = quantity > cap;

    // Get supplier info
    const supplier = await prisma.user.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Get batch info
    const batch = await prisma.batch.findUnique({
      where: { batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        buyerId: buyer.id,
        buyerRole: buyer.role,
        supplierId,
        supplierRole: supplier.role,
        batchId,
        medicineName: batch.medicineName,
        quantity,
        isSpecialOrder,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        isSpecialOrder,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

const updateOrderSchema = z.object({
  orderId: z.string().min(1),
  action: z.enum(["approve", "reject", "ship", "deliver", "cancel"]),
  rejectionReason: z.string().max(500).optional(),
});

// PATCH - Update order status
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const validated = updateOrderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { orderId, action, rejectionReason } = validated.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate action based on user role and order status
    const isSupplier = order.supplierId === user.id;
    const isBuyer = order.buyerId === user.id;

    let newStatus: string;
    switch (action) {
      case "approve":
        if (!isSupplier || order.status !== "PENDING") {
          return NextResponse.json(
            { error: "Cannot approve this order" },
            { status: 400 }
          );
        }
        newStatus = "APPROVED";
        break;
      case "reject":
        if (!isSupplier || order.status !== "PENDING") {
          return NextResponse.json(
            { error: "Cannot reject this order" },
            { status: 400 }
          );
        }
        newStatus = "REJECTED";
        break;
      case "ship":
        if (!isSupplier || order.status !== "APPROVED") {
          return NextResponse.json(
            { error: "Cannot ship this order" },
            { status: 400 }
          );
        }
        newStatus = "SHIPPED";
        break;
      case "deliver":
        if (!isBuyer || order.status !== "SHIPPED") {
          return NextResponse.json(
            { error: "Cannot confirm delivery" },
            { status: 400 }
          );
        }
        newStatus = "DELIVERED";
        break;
      case "cancel":
        if (!isBuyer || !["PENDING", "APPROVED"].includes(order.status)) {
          return NextResponse.json(
            { error: "Cannot cancel this order" },
            { status: 400 }
          );
        }
        newStatus = "CANCELLED";
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus as "PENDING" | "APPROVED" | "REJECTED" | "SHIPPED" | "DELIVERED" | "CANCELLED",
        rejectionReason: action === "reject" ? rejectionReason : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
