import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user?.role === "ADMIN" && user?.status === "APPROVED";
}

// GET - List all approved members with their stock
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");
    const statusFilter = searchParams.get("status") || "APPROVED";

    const where: Record<string, unknown> = {};
    if (roleFilter && roleFilter !== "ALL") {
      where.role = roleFilter;
    }
    if (statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        manufacturer: {
          include: {
            stock: true,
          },
        },
        distributor: {
          include: {
            stock: true,
          },
        },
        pharmacy: {
          include: {
            stock: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const members = users.map((user) => {
      const profile = user.manufacturer || user.distributor || user.pharmacy;
      const stock =
        user.manufacturer?.stock ||
        user.distributor?.stock ||
        user.pharmacy?.stock ||
        [];

      return {
        id: user.id,
        email: user.email,
        wallet: user.wallet,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        profile: profile
          ? {
              id: profile.id,
              name:
                (user.manufacturer?.companyName ||
                  user.distributor?.companyName ||
                  user.pharmacy?.pharmacyName) ??
                "Unknown",
              licenseNumber: profile.licenseNumber,
              verifiedBadge: profile.verifiedBadge,
            }
          : null,
        stockCount: stock.reduce((sum, s) => sum + s.quantity, 0),
        stockItems: stock.length,
      };
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 }
    );
  }
}

const revokeSchema = z.object({
  userId: z.string().min(1),
});

// DELETE - Revoke a member's access
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validated = revokeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId } = validated.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update user status to REVOKED
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: "REVOKED" },
      });

      // Also revoke from RoleAssignment
      if (user.wallet) {
        await tx.roleAssignment.deleteMany({
          where: { wallet: user.wallet },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking member:", error);
    return NextResponse.json(
      { error: "Failed to revoke member" },
      { status: 500 }
    );
  }
}
