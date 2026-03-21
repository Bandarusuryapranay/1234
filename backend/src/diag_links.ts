import { prisma } from './lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'CANDIDATE' },
    include: { candidateProfile: { select: { id: true, status: true } } }
  })

  console.log('--- CANDIDATE Link Integrity Check ---')
  for (const u of users) {
    console.log(`User: ${u.email} [${u.id}]`)
    console.log(`  Profile: ${u.candidateProfile ? u.candidateProfile.id : '!!! MISSING !!!'} [Status: ${u.candidateProfile?.status || 'N/A'}]`)
  }
}

main().catch(console.error)
