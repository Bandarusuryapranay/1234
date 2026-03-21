const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const at = await p.candidateAttempt.findMany({ select: { id: true, assignedQuestionIds: true, status: true } });
  console.log('Attempts:', JSON.stringify(at, null, 2));
  const q = await p.question.count();
  console.log('Total Questions in DB:', q);
  const aqs = await p.question.findMany({ select: { id: true } });
  console.log('Questions:', JSON.stringify(aqs.slice(0, 5), null, 2));
}
main().finally(() => p.$disconnect());
