import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "MediProof <noreply@mediproof.io>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return { success: false, error: "Email not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Email send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// Email templates
export function getApprovalEmail(role: string, companyName: string) {
  return {
    subject: "Your MediProof Application Has Been Approved!",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #18181b; padding: 24px; border-radius: 12px;">
          <h1 style="color: #fafafa; margin: 0 0 16px;">Welcome to MediProof</h1>
          <p style="color: #a1a1aa; margin: 0 0 16px;">
            Great news! Your application as a <strong style="color: #fafafa;">${role}</strong> 
            for <strong style="color: #fafafa;">${companyName}</strong> has been approved.
          </p>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            You can now access your dashboard and start using MediProof to manage your pharmaceutical supply chain.
          </p>
          <a href="https://mediproof.io/dashboard" 
             style="display: inline-block; background: #fafafa; color: #18181b; padding: 12px 24px; 
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #71717a; font-size: 12px; margin-top: 16px; text-align: center;">
          MediProof - Supply-chain trust infrastructure
        </p>
      </div>
    `,
  };
}

export function getRejectionEmail(
  role: string,
  companyName: string,
  reason?: string
) {
  return {
    subject: "Update on Your MediProof Application",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #18181b; padding: 24px; border-radius: 12px;">
          <h1 style="color: #fafafa; margin: 0 0 16px;">Application Update</h1>
          <p style="color: #a1a1aa; margin: 0 0 16px;">
            We've reviewed your application as a <strong style="color: #fafafa;">${role}</strong> 
            for <strong style="color: #fafafa;">${companyName}</strong>.
          </p>
          <p style="color: #a1a1aa; margin: 0 0 16px;">
            Unfortunately, we were unable to approve your application at this time.
          </p>
          ${
            reason
              ? `
          <div style="background: #27272a; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="color: #fafafa; margin: 0;"><strong>Reason:</strong></p>
            <p style="color: #a1a1aa; margin: 8px 0 0;">${reason}</p>
          </div>
          `
              : ""
          }
          <p style="color: #a1a1aa; margin: 16px 0 24px;">
            If you believe this is an error or have questions, please contact our support team.
          </p>
          <a href="https://mediproof.io/contact" 
             style="display: inline-block; background: #fafafa; color: #18181b; padding: 12px 24px; 
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            Contact Support
          </a>
        </div>
        <p style="color: #71717a; font-size: 12px; margin-top: 16px; text-align: center;">
          MediProof - Supply-chain trust infrastructure
        </p>
      </div>
    `,
  };
}

export function getContactFormEmail(
  name: string,
  email: string,
  subject: string,
  message: string
) {
  return {
    subject: `Contact Form: ${subject}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #18181b; padding: 24px; border-radius: 12px;">
          <h1 style="color: #fafafa; margin: 0 0 16px;">New Contact Form Submission</h1>
          <div style="background: #27272a; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="color: #fafafa; margin: 0 0 8px;"><strong>From:</strong> ${name}</p>
            <p style="color: #fafafa; margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
            <p style="color: #fafafa; margin: 0;"><strong>Subject:</strong> ${subject}</p>
          </div>
          <div style="background: #27272a; padding: 16px; border-radius: 8px;">
            <p style="color: #fafafa; margin: 0 0 8px;"><strong>Message:</strong></p>
            <p style="color: #a1a1aa; margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      </div>
    `,
  };
}

export function getReportSubmittedEmail(
  entityName: string,
  entityType: string
) {
  return {
    subject: "Your Report Has Been Received",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #18181b; padding: 24px; border-radius: 12px;">
          <h1 style="color: #fafafa; margin: 0 0 16px;">Report Received</h1>
          <p style="color: #a1a1aa; margin: 0 0 16px;">
            Thank you for submitting a report regarding 
            <strong style="color: #fafafa;">${entityName}</strong> (${entityType}).
          </p>
          <p style="color: #a1a1aa; margin: 0 0 24px;">
            Our team will review your report and take appropriate action. 
            We take all reports seriously and will investigate thoroughly.
          </p>
          <p style="color: #71717a; font-size: 14px;">
            You may be contacted for additional information if needed.
          </p>
        </div>
        <p style="color: #71717a; font-size: 12px; margin-top: 16px; text-align: center;">
          MediProof - Supply-chain trust infrastructure
        </p>
      </div>
    `,
  };
}
