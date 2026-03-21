export function credentialTemplate(p: {
  candidateName: string, role: string, campaignName: string,
  email: string, tempPassword: string, loginUrl: string
}): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2>SmartHire Assessment Invitation</h2>
  <p>Hi ${p.candidateName},</p>
  <p>You have been invited to complete the technical assessment for <strong>${p.role}</strong>.</p>
  <div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0">
    <p><strong>Login URL:</strong> <a href="${p.loginUrl}">${p.loginUrl}</a></p>
    <p><strong>Email:</strong> ${p.email}</p>
    <p><strong>Temporary Password:</strong> <code style="background:#e0e0e0;padding:2px 6px;border-radius:4px">${p.tempPassword}</code></p>
  </div>
  <p>You will be asked to change your password on first login. Please complete the assessment in one sitting — your session will be proctored via camera and microphone.</p>
  <p style="color:#888;font-size:12px">SmartHire AI — automated message, do not reply.</p>
</body></html>`
}
