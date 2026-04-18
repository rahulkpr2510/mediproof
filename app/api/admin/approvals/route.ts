import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  getApprovalEmail,
  getRejectionEmail,
} from "@/lib/server/email";

// Check if the current user is an admin
async function isAdmin() {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return user?.role === "ADMIN" && user?.status === "APPROVED";
}

// GET - List pending applications
export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const pendingUsers = await prisma.user.findMany({
      where: { status: "PENDING" },
      include: {
        manufacturer: true,
        distributor: true,
        pharmacy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const applications = pendingUsers.map((user) => {
      const profile = user.manufacturer || user.distributor || user.pharmacy;
      return {
        id: user.id,
        email: user.email,
        wallet: user.wallet,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        profile: profile
          ? {
              name:
                (user.manufacturer?.companyName ||
                  user.distributor?.companyName ||
                  user.pharmacy?.pharmacyName) ??
                "Unknown",
              licenseNumber:
                profile.licenseNumber ?? "N/A",
              documents: (profile.documents as string[]) ?? [],
              verifiedBadge:
                profile.verifiedBadge ?? false,
            }
          : null,
      };
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

const actionSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(1000).optional(),
  verifiedBadge: z.boolean().optional(),
});

// POST - Approve or reject an application
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validated = actionSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { userId, action, reason, verifiedBadge } = validated.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        manufacturer: true,
        distributor: true,
        pharmacy: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.status !== "PENDING") {
      return NextResponse.json(
        { error: "Application already processed" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
    const profile = user.manufacturer || user.distributor || user.pharmacy;
    const companyName =
      user.manufacturer?.companyName ||
      user.distributor?.companyName ||
      user.pharmacy?.pharmacyName ||
      "Your company";

    // Update user status
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: newStatus },
      });

      // If approved and verified badge requested, update profile
      if (action === "approve" && verifiedBadge) {
        if (user.manufacturer) {
          await tx.manufacturer.update({
            where: { id: user.manufacturer.id },
            data: { verifiedBadge: true },
          });
        } else if (user.distributor) {
          await tx.distributor.update({
            where: { id: user.distributor.id },
            data: { verifiedBadge: true },
          });
        } else if (user.pharmacy) {
          await tx.pharmacy.update({
            where: { id: user.pharmacy.id },
            data: { verifiedBadge: true },
          });
        }
      }

      // If approved, sync to RoleAssignment for backward compatibility
      if (action === "approve" && user.wallet) {
        await tx.roleAssignment.upsert({
          where: { wallet: user.wallet },
          update: { role: user.role },
          create: { wallet: user.wallet, role: user.role },
        });
      }
    });

    // Send email notification
    const emailContent =
      action === "approve"
        ? getApprovalEmail(user.role, companyName)
        : getRejectionEmail(user.role, companyName, reason);

    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
