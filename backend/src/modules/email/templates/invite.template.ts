export function inviteTemplate(p: { candidateName: string, role: string, loginUrl: string }): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2>Assessment Reminder</h2>
  <p>Hi ${p.candidateName}, this is a reminder to complete your assessment for <strong>${p.role}</strong>.</p>
  <p><a href="${p.loginUrl}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Start Assessment</a></p>
</body></html>`
}
