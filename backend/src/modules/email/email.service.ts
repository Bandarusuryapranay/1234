import nodemailer from 'nodemailer'
import { prisma } from '../../lib/prisma'
import { credentialTemplate } from './templates/credential.template'

// ── Transporter ───────────────────────────────────────────────
// Works with Gmail, Outlook, any SMTP provider
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function send(to: string, subject: string, html: string): Promise<string> {
  const info = await transporter.sendMail({
    from:    `"SmartHire AI" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  })
  return info.messageId
}

export async function sendCandidateCredentials(params: {
  candidateId:  string
  toEmail:      string
  candidateName:string
  tempPassword: string
  campaignName: string
  role:         string
  loginUrl:     string
}) {
  const log = await prisma.emailLog.create({
    data: {
      candidateId:  params.candidateId,
      toEmail:      params.toEmail,
      subject:      `Assessment Invitation — ${params.role}`,
      templateName: 'CREDENTIALS',
      status:       'PENDING',
    },
  })

  try {
    const html = credentialTemplate({ ...params, email: params.toEmail })
    const msgId = await send(params.toEmail, `Your SmartHire Assessment — ${params.role}`, html)
    await prisma.emailLog.update({
      where: { id: log.id },
      data:  { status: 'SENT', sentAt: new Date(), graphMessageId: msgId },
    })
  } catch (err: any) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data:  { status: 'FAILED', failureReason: err.message },
    })
    throw err
  }
}

export async function sendForwardToAdmin(params: {
  candidateId:   string
  toEmail:       string
  adminName:     string
  candidateName: string
  role:          string
  campaignName:  string
  fitPercent:    number
  trustScore:    number
  aiSummary:     string
  missingSkills: string[]
  recruiterNotes:string
  scorecardUrl:  string
}) {
  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#FB851E,#FB371E);padding:20px;border-radius:8px;margin-bottom:20px">
    <h2 style="color:#fff;margin:0">SmartHire AI — Candidate Scorecard</h2>
    <p style="color:rgba(255,255,255,0.8);margin:4px 0 0">Forwarded for your review</p>
  </div>

  <p>Hi ${params.adminName},</p>
  <p>A candidate scorecard has been forwarded for your review and round advancement decision.</p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
    <h3 style="margin:0 0 8px">${params.candidateName}</h3>
    <p style="margin:4px 0;color:#6b7280">Role: <strong>${params.role}</strong></p>
    <p style="margin:4px 0;color:#6b7280">Campaign: ${params.campaignName}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr>
      <td style="padding:16px;background:#f0fdf4;border-radius:6px;text-align:center;width:50%">
        <div style="font-size:32px;font-weight:bold;color:#10b981">${params.fitPercent.toFixed(0)}%</div>
        <div style="color:#6b7280;font-size:13px">Technical Fit</div>
      </td>
      <td style="width:16px"></td>
      <td style="padding:16px;background:#f0fdf4;border-radius:6px;text-align:center;width:50%">
        <div style="font-size:32px;font-weight:bold;color:#10b981">${params.trustScore.toFixed(0)}%</div>
        <div style="color:#6b7280;font-size:13px">Trust Score</div>
      </td>
    </tr>
  </table>

  ${params.aiSummary ? `
  <div style="border-left:4px solid #FB851E;padding:12px 16px;margin:16px 0;background:#fff7ed">
    <p style="margin:0;font-style:italic;color:#92400e">"${params.aiSummary}"</p>
  </div>` : ''}

  ${params.missingSkills?.length ? `<p><strong>Key skill gaps:</strong> ${params.missingSkills.join(', ')}</p>` : ''}
  ${params.recruiterNotes ? `<p><strong>Recruiter notes:</strong> ${params.recruiterNotes}</p>` : ''}

  <div style="margin:24px 0;text-align:center">
    <a href="${params.scorecardUrl}" style="background:linear-gradient(135deg,#FB851E,#FB371E);color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
      View Full Scorecard & Decide
    </a>
  </div>

  <p style="color:#9ca3af;font-size:12px">SmartHire AI — automated notification</p>
</body></html>`

  await send(params.toEmail, `[SmartHire] Candidate for Review: ${params.candidateName} — ${params.role}`, html)

  await prisma.emailLog.create({
    data: {
      candidateId:  params.candidateId,
      toEmail:      params.toEmail,
      subject:      `Scorecard Forwarded to Admin`,
      templateName: 'FORWARD_TO_ADMIN',
      status:       'SENT',
      sentAt:       new Date(),
    },
  })
}

export async function sendRecruiterCredentials(params: {
  toEmail:      string
  firstName:    string
  tempPassword: string
  loginUrl:     string
}) {
  const html = `
<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#374151">
  <div style="background:linear-gradient(135deg,#FB851E,#FB371E);padding:24px;border-radius:12px;margin-bottom:24px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">Welcome to SmartHire AI</h1>
    <p style="color:rgba(255,255,255,0.9);margin:8px 0 0">You've been added as a Recruiter</p>
  </div>

  <p>Hi ${params.firstName},</p>
  <p>An administrator has created a Recruiter account for you on the SmartHire AI platform. You can now manage campaigns, review candidate scorecards, and oversee the hiring pipeline.</p>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0">
    <h3 style="margin:0 0 16px;color:#111827">Your Access Credentials</h3>
    <table style="width:100%">
      <tr>
        <td style="padding:4px 0;width:120px;font-weight:600;color:#6b7280">Login URL:</td>
        <td style="padding:4px 0"><a href="${params.loginUrl}" style="color:#FB851E;text-decoration:none;font-weight:500">${params.loginUrl}</a></td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-weight:600;color:#6b7280">Username:</td>
        <td style="padding:4px 0;font-family:monospace;background:#f3f4f6;padding-left:8px;border-radius:4px">${params.toEmail}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-weight:600;color:#6b7280">Temporary Password:</td>
        <td style="padding:4px 0;font-family:monospace;background:#f3f4f6;padding-left:8px;border-radius:4px">${params.tempPassword}</td>
      </tr>
    </table>
  </div>

  <p><strong>Security Note:</strong> For your protection, you will be required to change this temporary password upon your first login.</p>

  <div style="margin:32px 0;text-align:center">
    <a href="${params.loginUrl}" style="background:linear-gradient(135deg,#FB851E,#FB371E);color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
      Sign In to Dashboard
    </a>
  </div>

  <hr style="border:0;border-top:1px solid #e5e7eb;margin:32px 0">
  <p style="color:#9ca3af;font-size:12px;text-align:center">SmartHire AI — Automated Provisioning System</p>
</body></html>`

  await send(params.toEmail, `[SmartHire] Your Recruiter Account Credentials`, html)
  
  await prisma.emailLog.create({
    data: {
      toEmail:      params.toEmail,
      subject:      `Recruiter Access Credentials`,
      templateName: 'RECRUITER_CREDENTIALS',
      status:       'SENT',
      sentAt:       new Date(),
    } as any, // Cast to any because of Windows file-locking preventing prisma generate from updating types
  })
}

export async function verifyConnection(): Promise<boolean> {
  try {
    await transporter.verify()
    return true
  } catch {
    return false
  }
}