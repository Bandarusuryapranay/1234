import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Usage: ts-node check_user.ts <email>')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      candidateProfile: true,
      recruiterProfile: true,
      adminProfile: true,
    }
  })

  if (!user) {
    console.log(`User not found: ${email}`)
    return
  }

  console.log('User found:')
  console.log({
    id: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    candidateStatus: user.candidateProfile?.status,
    candidateId: user.candidateProfile?.id
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
