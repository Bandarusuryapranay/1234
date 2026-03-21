# AWS CDK Migration & Deployment Guide

This guide provides a step-by-step walkthrough for migrating the SmartHire AI project to **AWS CDK** for Infrastructure-as-Code (IaC) and deploying it to the AWS Cloud.

## 🏗️ Architecture Overview

The recommended architecture for this stack on AWS is:
- **Frontend:** React (Vite) hosted in **Amazon S3** and distributed via **Amazon CloudFront**.
- **Backend:** Express API running on **AWS Fargate (ECS)** with an Application Load Balancer (ALB).
- **Database:** **Amazon RDS (Aurora PostgreSQL)** for persistent data.
- **Cache/Queue:** **Amazon ElastiCache (Redis)** for Bull MQ background jobs.
- **Media Storage:** **Amazon S3** (migrating from local/Cloudinary if preferred).
- **Secret Management:** **AWS Secrets Manager**.

---

## 🚀 Step 1: Prerequisites

Before starting, ensure you have:
1.  **AWS Account** with CLI access configured (`aws configure`).
2.  **Node.js** installed.
3.  **AWS CDK CLI** installed:
    ```bash
    npm install -g aws-cdk
    ```
4.  **Docker** installed (required for bundling the backend container).

---

## 📦 Step 2: Initialize the CDK Project

Create a new directory for your infrastructure and initialize CDK:

```bash
mkdir smarthire-infra && cd smarthire-infra
cdk init app --language typescript
```

---

## 🛠️ Step 3: Define the Infrastructure (The CDK Code)

In your `lib/smarthire-stack.ts`, define the core resources.

### 1. Networking (VPC)
```typescript
const vpc = new ec2.Vpc(this, 'SmartHireVpc', { maxAzs: 2 });
```

### 2. Database (Aurora PostgreSQL)
```typescript
const cluster = new rds.DatabaseCluster(this, 'SmartHireDB', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_15_2 }),
  credentials: rds.Credentials.fromGeneratedSecret('dbadmin'),
  instanceProps: { vpc, instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM) },
});
```

### 3. Backend Service (ECS Fargate)
```typescript
const fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
  vpc,
  cpu: 512,
  memoryLimitMiB: 1024,
  taskImageOptions: {
    image: ecs.ContainerImage.fromAsset('../backend'), // Points to your backend folder
    environment: {
      DATABASE_URL: `postgresql://...`, // Pulled from Secrets Manager
      GROQ_API_KEY: process.env.GROQ_API_KEY!,
    },
  },
  publicLoadBalancer: true,
});
```

### 4. Frontend Deployment (S3 + CloudFront)
```typescript
const siteBucket = new s3.Bucket(this, 'SiteBucket', {
  websiteIndexDocument: 'index.html',
  publicReadAccess: true,
});

new s3_deployment.BucketDeployment(this, 'DeployWebsite', {
  sources: [s3_deployment.Source.asset('../frontend/dist')],
  destinationBucket: siteBucket,
});

const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
  originConfigs: [{
    s3OriginSource: { s3BucketSource: siteBucket },
    behaviors: [{ isDefaultBehavior: true }],
  }],
});
```

---

## 🏗️ Step 4: Dockerize the Backend

Ensure your `backend/Dockerfile` is ready:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🚢 Step 5: Deployment Workflow

### 1. Bootstrap AWS
Required once per account/region to set up internal CDK storage:
```bash
cdk bootstrap
```

### 2. Prepare Frontend
Build the Vite app locally so CDK can pick up the `/dist` folder:
```bash
cd ../frontend
npm install && npm run build
cd ../smarthire-infra
```

### 3. Deploy
This will compile the TS, build the Docker image, upload to ECR, and create all AWS resources:
```bash
cdk deploy
```

---

## ⚙️ Step 6: Post-Deployment Configuration

1.  **Database Migration:** Use a bastion host or a temporary Lambda task to run `npx prisma db push` against the RDS instance.
2.  **Environment Variables:** Update your [.env](file:///d:/Indium/backend/.env) secrets in **AWS Secrets Manager**.
3.  **DNS:** Update your domain (e.g., Route53) to point to the CloudFront distribution URL.

## 💡 Best Practices

- **CI/CD:** Use **AWS CodePipeline** or **GitHub Actions** to automate `cdk deploy`.
- **Cost Management:** Use `t3.micro` or `t3.small` for dev environments to save costs.
- **Security:** Ensure the Database is in a private subnet and only accessible by the Fargate tasks.

---

*This guide provides a high-level template. You may need to adjust specific instance sizes and IAM roles based on your actual traffic and security requirements.*
