import { Resend } from "resend";

type EmailInput = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(input: EmailInput) {
  if (!process.env.RESEND_API_KEY) {
    console.info("Email skipped because RESEND_API_KEY is not configured", input.subject);
    return { skipped: true };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.EMAIL_FROM || "Aneeminen veikkauskisasivusto <no-reply@example.com>",
    ...input
  });
}
