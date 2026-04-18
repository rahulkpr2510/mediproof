import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const profileDataSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  pharmacyName: z.string().min(1).max(200).optional(),
  licenseNumber: z.string().min(1).max(100),
  gstNumber: z.string().min(1).max(50).optional(),
  address: z.string().min(1).max(500).optional(),
  warehouseAddress: z.string().min(1).max(500).optional(),
});

const onboardingSchema = z.object({
  role: z.enum(["MANUFACTURER", "DISTRIBUTOR", "PHARMACY"]),
  wallet: z
    .string()
    .regex(/^0x[a-f0-9]{40}$/i, "Invalid wallet address")
    .transform((v) => v.toLowerCase()),
  profileData: profileDataSchema,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const role = formData.get("role") as string;
    const wallet = formData.get("wallet") as string;
    const profileDataRaw = formData.get("profileData") as string;
    const documents = formData.getAll("documents") as File[];

    // Parse and validate input
    let profileData: z.infer<typeof profileDataSchema>;
    try {
      profileData = JSON.parse(profileDataRaw);
    } catch {
      return NextResponse.json(
        { error: "Invalid profile data format" },
        { status: 400 }
      );
    }

    const validated = onboardingSchema.safeParse({
      role,
      wallet,
      profileData,
    });

    if (!validated.success) {
      return NextResponse.json(
        { error: validated.error.issues[0].message },
        { status: 400 }
      );
    }

    // Validate files
    if (documents.length === 0) {
      return NextResponse.json(
        { error: "At least one document is required" },
        { status: 400 }
      );
    }

    for (const file of documents) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.name}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large: ${file.name}. Max 10MB.` },
          { status: 400 }
        );
      }
    }

    // Check for existing user or pending application
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ clerkId: userId }, { wallet: validated.data.wallet }],
      },
    });

    if (existingUser) {
      if (existingUser.status === "PENDING") {
        return NextResponse.json(
          { error: "You already have a pending application" },
          { status: 400 }
        );
      }
      if (existingUser.status === "APPROVED") {
        return NextResponse.json(
          { error: "You are already approved" },
          { status: 400 }
        );
      }
    }

    // Upload documents to Vercel Blob
    const documentUrls: string[] = [];
    for (const file of documents) {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `onboarding/${userId}/${timestamp}-${sanitizedName}`;

      const blob = await put(path, file, {
        access: "public",
        contentType: file.type,
      });
      documentUrls.push(blob.url);
    }

    // Create user and role-specific profile in transaction
    const { role: validatedRole, wallet: validatedWallet } = validated.data;
    const data = validated.data.profileData;

    const user = await prisma.$transaction(async (tx) => {
      // Create or update user
      const user = await tx.user.upsert({
        where: { clerkId: userId },
        update: {
          wallet: validatedWallet,
          role: validatedRole,
          status: "PENDING",
        },
        create: {
          clerkId: userId,
          email:
            (await auth().then((a) => a.sessionClaims?.email as string)) ||
            `${userId}@clerk.user`,
          wallet: validatedWallet,
          role: validatedRole,
          status: "PENDING",
        },
      });

      // Create role-specific profile
      if (validatedRole === "MANUFACTURER") {
        await tx.manufacturer.create({
          data: {
            userId: user.id,
            companyName: data.companyName || "",
            licenseNumber: data.licenseNumber,
            gstNumber: data.gstNumber || "",
            address: data.address || "",
            documents: documentUrls,
          },
        });
      } else if (validatedRole === "DISTRIBUTOR") {
        await tx.distributor.create({
          data: {
            userId: user.id,
            companyName: data.companyName || "",
            licenseNumber: data.licenseNumber,
            warehouseAddress: data.warehouseAddress || "",
            documents: documentUrls,
          },
        });
      } else if (validatedRole === "PHARMACY") {
        await tx.pharmacy.create({
          data: {
            userId: user.id,
            pharmacyName: data.pharmacyName || "",
            licenseNumber: data.licenseNumber,
            address: data.address || "",
            documents: documentUrls,
          },
        });
      }

      return user;
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      status: "PENDING",
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to process application" },
      { status: 500 }
    );
  }
}
