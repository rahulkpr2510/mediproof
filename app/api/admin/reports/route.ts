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

// GET - List all manual reports
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (statusFilter && statusFilter !== "ALL") {
      where.status = statusFilter;
    }

    const reports = await prisma.manualReport.findMany({
      where,
      include: {
        reporter: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        entityType: r.entityType,
        entityId: r.entityId,
        entityName: r.entityName,
        description: r.description,
        reporterName: r.reporterName,
        reporterEmail: r.reporterEmail || r.reporter?.email,
        reporterPhone: r.reporterPhone,
        status: r.status,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["PENDING", "REVIEWING", "RESOLVED", "DISMISSED"]),
  adminNotes: z.string().max(2000).optional(),
});

// PATCH - Update report status
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { reportId, status, adminNotes } = validated.data;

    const report = await prisma.manualReport.update({
      where: { id: reportId },
      data: {
        status,
        adminNotes,
        resolvedAt: status === "RESOLVED" ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        status: report.status,
      },
    });
  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}
