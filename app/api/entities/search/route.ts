import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/db';
import { z } from 'zod';

const SearchSchema = z.object({
  type: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'PHARMACY']),
  query: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const query = searchParams.get('query');

    const validated = SearchSchema.parse({ type, query });

    let results: any[] = [];

    if (validated.type === 'MANUFACTURER') {
      results = await prisma.manufacturer.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { licenseNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          licenseNumber: true,
        },
        take: 10,
      });
    } else if (validated.type === 'DISTRIBUTOR') {
      results = await prisma.distributor.findMany({
        where: {
          OR: [
            { companyName: { contains: query, mode: 'insensitive' } },
            { licenseNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          licenseNumber: true,
        },
        take: 10,
      });
    } else if (validated.type === 'PHARMACY') {
      results = await prisma.pharmacy.findMany({
        where: {
          OR: [
            { pharmacyName: { contains: query, mode: 'insensitive' } },
            { licenseNumber: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          pharmacyName: true,
          licenseNumber: true,
        },
        take: 10,
      });
    }

    // Normalize results
    const normalized = results.map((r: any) => ({
      id: r.id,
      name: r.companyName || r.pharmacyName,
      licenseNumber: r.licenseNumber,
    }));

    return NextResponse.json({ results: normalized });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Entity search error:', error);
    return NextResponse.json({ error: 'Search failed', results: [] }, { status: 500 });
  }
}
