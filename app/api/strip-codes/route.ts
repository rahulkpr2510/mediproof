import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomInt } from "crypto";

// Generate a unique 4-digit code
function generate4DigitCode(): string {
  return String(randomInt(1000, 9999));
}

const generateStripCodesSchema = z.object({
  batchId: z.string().min(1),
  unitId: z.string().min(1),
  stripsPerUnit: z.number().int().min(1).max(20).default(10),
});

// POST - Generate strip codes for a unit
export async function POST(req: NextRequest) {
  try {
    const wallet = req.headers.get("x-wallet-address");
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = generateStripCodesSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { batchId, unitId, stripsPerUnit } = validated.data;

    // Verify unit exists and belongs to this batch
    const unit = await prisma.unit.findFirst({
      where: {
        unitId,
        batchId,
      },
    });

    if (!unit) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 });
    }

    // Check if strip codes already exist for this unit
    const existingCodes = await prisma.stripCode.count({
      where: { unitId },
    });

    if (existingCodes > 0) {
      return NextResponse.json(
        { error: "Strip codes already generated for this unit" },
        { status: 400 }
      );
    }

    // Generate unique codes for each strip
    const stripCodes: { code: string; stripNumber: number }[] = [];
    const usedCodes = new Set<string>();

    for (let i = 1; i <= stripsPerUnit; i++) {
      let code: string;
      do {
        code = generate4DigitCode();
      } while (usedCodes.has(code));

      usedCodes.add(code);
      stripCodes.push({ code, stripNumber: i });
    }

    // Store in database
    await prisma.stripCode.createMany({
      data: stripCodes.map((sc) => ({
        code: sc.code,
        unitId,
        batchId,
        stripNumber: sc.stripNumber,
        used: false,
      })),
    });

    return NextResponse.json({
      success: true,
      unitId,
      stripCodes: stripCodes.map((sc) => ({
        stripNumber: sc.stripNumber,
        code: sc.code,
      })),
    });
  } catch (error) {
    console.error("Error generating strip codes:", error);
    return NextResponse.json(
      { error: "Failed to generate strip codes" },
      { status: 500 }
    );
  }
}

const verifyStripCodeSchema = z.object({
  unitId: z.string().min(1),
  code: z.string().length(4),
});

// PUT - Verify a strip code (mark as used)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = verifyStripCodeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    const { unitId, code } = validated.data;

    // Find the strip code
    const stripCode = await prisma.stripCode.findFirst({
      where: {
        unitId,
        code,
      },
    });

    if (!stripCode) {
      return NextResponse.json(
        {
          valid: false,
          error: "Invalid strip code",
          message:
            "This code does not match any strip in this unit. The medicine may be counterfeit.",
        },
        { status: 200 }
      );
    }

    if (stripCode.used) {
      return NextResponse.json(
        {
          valid: false,
          error: "Strip code already used",
          message:
            "This strip has already been verified. It may have been sold previously or could be a duplicate.",
          usedAt: stripCode.usedAt?.toISOString(),
        },
        { status: 200 }
      );
    }

    // Mark as used
    await prisma.stripCode.update({
      where: { id: stripCode.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({
      valid: true,
      message: "Strip code verified successfully",
      stripNumber: stripCode.stripNumber,
      batchId: stripCode.batchId,
    });
  } catch (error) {
    console.error("Error verifying strip code:", error);
    return NextResponse.json(
      { error: "Failed to verify strip code" },
      { status: 500 }
    );
  }
}

// GET - Get strip codes for a unit (for pharmacy display)
export async function GET(req: NextRequest) {
  try {
    const wallet = req.headers.get("x-wallet-address");
    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unitId = searchParams.get("unitId");

    if (!unitId) {
      return NextResponse.json(
        { error: "unitId required" },
        { status: 400 }
      );
    }

    const stripCodes = await prisma.stripCode.findMany({
      where: { unitId },
      orderBy: { stripNumber: "asc" },
    });

    return NextResponse.json({
      unitId,
      stripCodes: stripCodes.map((sc) => ({
        stripNumber: sc.stripNumber,
        code: sc.code,
        used: sc.used,
        usedAt: sc.usedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching strip codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch strip codes" },
      { status: 500 }
    );
  }
}
