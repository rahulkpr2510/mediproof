import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/server/db';
import { z } from 'zod';

const ManualReportSchema = z.object({
  entityType: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY']),
  entityId: z.string().min(1),
  entityName: z.string().min(1),
  description: z.string().min(10),
  reporterName: z.string().optional(),
  reporterEmail: z.string().email().optional(),
  reporterPhone: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const validated = ManualReportSchema.parse(body);

    const report = await prisma.manualReport.create({
      data: {
        reporterId: userId || undefined,
        entityType: validated.entityType,
        entityId: validated.entityId,
        entityName: validated.entityName,
        description: validated.description,
        reporterName: validated.reporterName,
        reporterEmail: validated.reporterEmail,
        reporterPhone: validated.reporterPhone,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, reportId: report.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Report submission error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
