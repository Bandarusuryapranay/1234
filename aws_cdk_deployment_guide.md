# AWS CDK Migration & Deployment Guide (Single-Node EC2)

This guide provides a step-by-step walkthrough for deploying the custom **Node.js (Express + Prisma)** backend alongside the **Judge0** code execution system to a single AWS EC2 instance using **AWS CDK**.

## 🏗️ Architecture Overview

The recommended architecture for this stack is highly cost-effective and specifically tailored for staging environments or low-traffic platforms.

- **Infrastructure:** AWS EC2 (t3.medium recommended) provisioned via AWS CDK.
- **Orchestration:** Docker Compose running natively on the EC2 instance.
- **Backend:** Node.js (Express) built and run natively in a container on port 4000.
- **Code Execution:** Judge0 CE Server and Worker containers.
- **Database / Cache:** PostgreSQL (for backend + Judge0) and Redis (for Judge0 queues).
- **Reverse Proxy:** Nginx routing incoming HTTP traffic on port 80 to the Node.js backend.

---

## 🚀 Step 1: Prerequisites

Before starting, ensure you have:
1.  **AWS Account** with CLI access configured (`aws configure`).
2.  **Node.js** installed locally.

---

## 📦 Step 2: Running the Stack

The infrastructure code now lives in `infra/cdk-stack-ec2.ts` with a dedicated `infra/package.json` for CDK tooling.

### 1. Install Dependencies

```bash
cd infra
npm install
```

### 2. Create Deployment Env File

```bash
cp .env.deploy.example .env.deploy.local
```

Fill `.env.deploy.local` with your real values (`KEY_NAME`, `REPO_URL`, `DATABASE_URL`, JWT values, API keys, SMTP, Cloudinary, Azure values).

If you use an external database (for example Supabase), set `DATABASE_URL` in `.env.deploy.local` and the stack will inject it into backend `.env` instead of using local postgres for backend data.

### 3. Bootstrap CDK (Once Per Account + Region)

```bash
npx cdk bootstrap
```

### 4. Preview the Deployment

```bash
npm run diff:env
```

### 5. Deploy
Deploy using values from `.env.deploy.local`.

```bash
npm run deploy:env
```

You can still run raw CDK commands if needed:

```bash
npm run deploy -- --require-approval never --parameters KeyName="..." --parameters RepoUrl="..."
```

---

## 🛠️ Step 3: What Happens During Deployment?

Once the CDK finishes provisioning the EC2 instance, the **User Data bootstrap script** takes over asynchronously:

1. **System Setup:** Installs Docker, Docker Compose, Git, Nginx, and `pwgen`.
2. **Swap File Creation:** Crucially allocates 2GB of swap space to prevent the instance from running out of memory during the `npm run build` phase.
3. **Fetching the Repo:** Clones your backend repository directly into the instance.
4. **Environment Variables:** Generates randomized Postgres/JWT secrets and creates `.env` with all required backend keys (`DATABASE_URL`, JWT keys, `OPENAI_*`, `GROQ_API_KEY`, Azure Graph settings, `CLIENT_URL`, `FRONTEND_URL`, Judge0 URLs).
5. **Docker Build & Launch:** 
   - Starts Postgres and Redis.
   - Waits dynamically for Postgres to become healthy.
   - Bootstraps the Dockerfile to `npm install`, compile Prisma, and build Node.
   - Starts Judge0 and the Backend.
6. **Database Migration:** Executes `npx prisma db push` before finally starting your Node.js server.

---

## ⚙️ Step 4: Post-Deployment Configuration

1. **Viewing Your IP:** Once the `cdk deploy` finishes, it will output your instance's public IP address (e.g., `InstancePublicIp: 54.123.x.x`). You can access your backend by navigating to `http://<YOUR_IP>`.
2. **Updating Code:** To release new code, you can SSH into your instance, pull the latest changes, and restart the backend container, or re-run the CDK deployment (which will replace the instance due to User Data changes).
3. **HTTPS / Domain:** To secure Nginx, attach an Elastic IP or point a domain to the instance and execute `certbot`.

## 💡 Best Practices & Risks

- **Memory Usage:** The Node.js compilation and Prisma client generation process is heavy. A minimum of `t3.medium` is recommended. The script uses a 2GB swap file as a safeguard, but `t3.micro` sizes may still experience instability during builds.
- **Statefulness:** Because this is a single EC2 instance with dockerized PostgreSQL mapping to an EBS volume, replacing the instance (via CDK updates to the User Data script) will result in **data loss** unless the EBS volume is retained or snapshot backups are regularly taken. For production, consider externalizing the database to RDS.
