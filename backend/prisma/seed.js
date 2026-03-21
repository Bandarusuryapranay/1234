"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
// ─────────────────────────────────────────────
//  SEED DATA
// ─────────────────────────────────────────────
const ADMIN = {
    email: 'admin@smarthire.dev',
    password: 'Admin@1234',
    firstName: 'Platform',
    lastName: 'Admin',
};
const RECRUITER = {
    email: 'recruiter@smarthire.dev',
    password: 'Recruiter@1234',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    department: 'Engineering',
};
const CANDIDATE = {
    email: 'candidate@smarthire.dev',
    password: 'Candidate@1234',
    firstName: 'Arjun',
    lastName: 'Sharma',
};
// Full JD used as AI anchor
const SAMPLE_JD = `
We are looking for a Senior Full-Stack Engineer to join our product team.

Required Skills:
- 4+ years of experience with React.js and TypeScript
- Strong Node.js and Express.js backend development
- PostgreSQL and experience with ORMs (Prisma preferred)
- REST API design and GraphQL basics
- Experience with Redis, BullMQ or similar job queues
- Familiarity with Docker and CI/CD pipelines
- Understanding of JWT authentication and security best practices
- Git workflow and code review practices

Nice to Have:
- Experience with Next.js
- Knowledge of AWS or GCP cloud services
- Prior experience in a startup environment

Responsibilities:
- Design and build scalable backend services
- Collaborate with frontend teams on API contracts
- Write unit and integration tests
- Participate in architecture discussions
`.trim();
// Full pipeline config — this is the JSONB stored on Campaign.pipelineConfig
const PIPELINE_CONFIG = {
    timerMode: 'PER_SLICE',
    proctoring: {
        maxStrikes: 3,
        strikeOnPhone: true,
        strikeOnFaceAway: true,
        strikeOnMultipleFaces: true,
        strikeOnTabSwitch: true,
        strikeOnFocusLoss: true,
        flagBackgroundVoice: true, // flag only — not a strike
    },
    rounds: [
        {
            order: 1,
            roundType: 'MCQ',
            timeLimitMinutes: 30,
            totalQuestions: 20,
            difficultyEasy: 40,
            difficultyMedium: 40,
            difficultyHard: 20,
            shuffleQuestions: true,
            negativeMarking: true,
            penaltyPerWrong: 0.25,
            marksPerQuestion: 1,
            passMarkPercent: 60,
            failAction: 'MANUAL_REVIEW',
        },
        {
            order: 2,
            roundType: 'CODING',
            timeLimitMinutes: 60,
            problemCount: 2,
            allowedLanguages: ['javascript', 'python', 'typescript', 'java'],
            difficultyEasy: 0,
            difficultyMedium: 50,
            difficultyHard: 50,
            passMarkPercent: 50, // at least 1 problem must pass majority test cases
            failAction: 'MANUAL_REVIEW',
        },
        {
            order: 3,
            roundType: 'INTERVIEW',
            interviewMode: 'TEXT',
            timeLimitMinutes: 40,
            questionCount: 5,
            depth: 'DEEP',
            followUpEnabled: true,
            passMarkPercent: 60,
            failAction: 'MANUAL_REVIEW',
        },
    ],
};
// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
async function hash(plain) {
    return bcryptjs_1.default.hash(plain, 12);
}
function log(msg) {
    console.log(`  ✓  ${msg}`);
}
// ─────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────
async function main() {
    console.log('\n🌱  SmartHire AI — database seed\n');
    // ── 1. Admin ────────────────────────────────
    const adminUser = await prisma.user.upsert({
        where: { email: ADMIN.email },
        update: {},
        create: {
            email: ADMIN.email,
            passwordHash: await hash(ADMIN.password),
            firstName: ADMIN.firstName,
            lastName: ADMIN.lastName,
            role: 'ADMIN',
            isActive: true,
            adminProfile: { create: { department: 'Platform' } },
        },
        include: { adminProfile: true },
    });
    log(`Admin created       → ${adminUser.email}  (password: ${ADMIN.password})`);
    // ── 2. Recruiter ────────────────────────────
    const recruiterUser = await prisma.user.upsert({
        where: { email: RECRUITER.email },
        update: {},
        create: {
            email: RECRUITER.email,
            passwordHash: await hash(RECRUITER.password),
            firstName: RECRUITER.firstName,
            lastName: RECRUITER.lastName,
            role: 'RECRUITER',
            isActive: true,
            mustChangePassword: false,
            recruiterProfile: { create: { department: RECRUITER.department } },
        },
        include: { recruiterProfile: true },
    });
    log(`Recruiter created   → ${recruiterUser.email}  (password: ${RECRUITER.password})`);
    // ── 3. Campaign ─────────────────────────────
    const existingCampaign = await prisma.campaign.findFirst({
        where: { name: 'Senior Full-Stack Engineer — 2025' },
    });
    let campaign = existingCampaign;
    if (!campaign) {
        campaign = await prisma.campaign.create({
            data: {
                name: 'Senior Full-Stack Engineer — 2025',
                role: 'Senior Full-Stack Engineer',
                department: 'Engineering',
                jobDescription: SAMPLE_JD,
                status: 'ACTIVE',
                maxCandidates: 50,
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
                adminId: adminUser.adminProfile.id,
                pipelineConfig: PIPELINE_CONFIG,
            },
        });
        log(`Campaign created    → "${campaign.name}"`);
    }
    else {
        log(`Campaign exists     → "${campaign.name}" (skipped)`);
    }
    // ── 4. Pipeline Rounds ──────────────────────
    const existingRounds = await prisma.pipelineRound.findMany({
        where: { campaignId: campaign.id },
    });
    if (existingRounds.length === 0) {
        await prisma.pipelineRound.createMany({
            data: PIPELINE_CONFIG.rounds.map((r) => ({
                campaignId: campaign.id,
                order: r.order,
                roundType: r.roundType,
                roundConfig: r,
                interviewMode: r.interviewMode ?? null,
                timerMode: 'PER_SLICE',
                timeLimitMinutes: r.timeLimitMinutes,
                passMarkPercent: r.passMarkPercent,
                failAction: r.failAction,
            })),
        });
        log(`Pipeline rounds     → 3 rounds created (MCQ → Coding → Interview)`);
    }
    else {
        log(`Pipeline rounds     → already exist (skipped)`);
    }
    // ── 5. Assign Recruiter to Campaign ─────────
    await prisma.campaignRecruiter.upsert({
        where: {
            campaignId_recruiterId: {
                campaignId: campaign.id,
                recruiterId: recruiterUser.recruiterProfile.id,
            },
        },
        update: {},
        create: {
            campaignId: campaign.id,
            recruiterId: recruiterUser.recruiterProfile.id,
        },
    });
    log(`Recruiter assigned  → Sarah Mitchell → "${campaign.name}"`);
    // ── 6. Candidate (LOCKED by default) ────────
    const candidateUser = await prisma.user.upsert({
        where: { email: CANDIDATE.email },
        update: {},
        create: {
            email: CANDIDATE.email,
            passwordHash: await hash(CANDIDATE.password),
            firstName: CANDIDATE.firstName,
            lastName: CANDIDATE.lastName,
            role: 'CANDIDATE',
            isActive: true,
            mustChangePassword: true,
            candidateProfile: {
                create: {
                    campaignId: campaign.id,
                    status: 'LOCKED',
                },
            },
        },
        include: { candidateProfile: true },
    });
    log(`Candidate created   → ${candidateUser.email}  (status: LOCKED — recruiter must unlock)`);
    // ── 7. Question Pool placeholder ────────────
    const rounds = await prisma.pipelineRound.findMany({
        where: { campaignId: campaign.id },
        orderBy: { order: 'asc' },
    });
    for (const round of rounds) {
        await prisma.questionPool.upsert({
            where: { roundId: round.id },
            update: {},
            create: {
                campaignId: campaign.id,
                roundId: round.id,
                status: 'READY', // Will be 'GENERATING' in prod when AI call fires
                generatedBy: 'seed',
                generatedAt: new Date(),
                adminApproved: false,
            },
        });
    }
    log(`Question pools      → placeholder pools created (run /generate-pool to populate with AI)`);
    // ── 8. Audit log entry ───────────────────────
    await prisma.auditLog.create({
        data: {
            actorId: adminUser.id,
            actorRole: 'ADMIN',
            action: 'SEED_EXECUTED',
            entityType: 'Campaign',
            entityId: campaign.id,
            metadata: { note: 'Initial database seed' },
        },
    });
    log(`Audit log           → SEED_EXECUTED recorded`);
    // ── Summary ──────────────────────────────────
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Seed complete. Login credentials:

  ADMIN
    Email    : ${ADMIN.email}
    Password : ${ADMIN.password}

  RECRUITER
    Email    : ${RECRUITER.email}
    Password : ${RECRUITER.password}

  CANDIDATE  (locked — recruiter must grant permission first)
    Email    : ${CANDIDATE.email}
    Password : ${CANDIDATE.password}

  Next step → POST /api/admin/campaigns/${campaign.id}/generate-pool
              to trigger OpenAI question generation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}
main()
    .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map