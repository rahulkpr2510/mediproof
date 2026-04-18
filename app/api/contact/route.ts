import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resend } from '@/lib/server/email';

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().min(1),
  message: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ContactSchema.parse(body);

    // Send email via Resend
    await resend.emails.send({
      from: 'noreply@mediproof.app',
      to: 'support@mediproof.app',
      subject: `Contact Form: ${validated.subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${validated.name}</p>
        <p><strong>Email:</strong> ${validated.email}</p>
        ${validated.phone ? `<p><strong>Phone:</strong> ${validated.phone}</p>` : ''}
        <p><strong>Subject:</strong> ${validated.subject}</p>
        <h3>Message:</h3>
        <p>${validated.message.replace(/\n/g, '<br>')}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
