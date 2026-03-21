# AWS "Pure Serverless" Deployment Guide (No Docker/Redis)

This guide shows you how to deploy the SmartHire AI project using **AWS Lambda** and **AWS SQS** (replacing Docker and Redis) for a true "pay-per-use" serverless architecture.

## 🏗️ Serverless Architecture Overview

- **Frontend:** React (Vite) hosted in **Amazon S3** + **CloudFront**.
- **Backend API:** Express.js wrapped in **AWS Lambda** via `serverless-http`.
- **API Gateway:** Provides the HTTPS endpoint for your Lambda.
- **Background Jobs:** **Amazon SQS** (Simple Queue Service) replaces Redis/BullMQ.
- **Database:** **Amazon RDS (Aurora Serverless v2)** + **RDS Proxy**.
- **Secret Management:** **AWS Secrets Manager**.

---

## 🛠️ Step 1: Tool Installation

In this architecture, you **do not** need Docker.

```bash
npm install -g aws-cdk
npm install serverless-http # Required in your backend folder
```

---

## 🏗️ Step 2: Infrastructure as Code (CDK)

In your infrastructure stack:

### 1. Database & Proxy
Serverless v2 scales down to 0.5 ACU (approx. $0.06/hour).
```typescript
const cluster = new rds.DatabaseCluster(this, 'SmartHireDB', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_15_2 }),
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 2.0,
  vpc,
});

const proxy = new rds.DatabaseProxy(this, 'DBProxy', {
  dbProxyName: 'SmartHireProxy',
  vpc,
  dbProxyTarget: rds.ProxyTarget.fromCluster(cluster),
  secrets: [cluster.secret!],
});
```

### 2. SQS (The Queue)
```typescript
const gapAnalysisQueue = new sqs.Queue(this, 'GapAnalysisQueue', {
  visibilityTimeout: Duration.seconds(300), // Max AI processing time
});
```

### 3. Backend API (Lambda)
```typescript
const apiLambda = new lambda.Function(this, 'ApiHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  code: lambda.Code.fromAsset('../backend/dist'), // Pre-built TS code
  handler: 'index.handler', // The wrapped Express export
  vpc,
  environment: {
    DATABASE_URL: `postgresql://${proxy.endpoint}/smarthire`,
    SQS_QUEUE_URL: gapAnalysisQueue.queueUrl,
  },
});

const api = new apigateway.LambdaRestApi(this, 'SmartHireAPI', {
  handler: apiLambda,
});
```

---

## 📦 Step 3: Code Adjustments for Serverless

### 1. Wrap the API ([backend/src/index.ts](file:///d:/Indium/backend/src/index.ts))
```typescript
import serverless from 'serverless-http';
import app from './app';

// Export for Lambda
export const handler = serverless(app);

// Keep local dev working
if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => console.log('Listening on 3000...'));
}
```

### 2. Swap BullMQ to SQS
In your workers, instead of `gapAnalysisQueue.add()`, you will use the **AWS SDK**:
```typescript
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({ region: "us-east-1" });

export async function queueGapAnalysis(candidateId: string) {
  const command = new SendMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify({ candidateId }),
  });
  await sqs.send(command);
}
```

---

## 🚢 Step 4: Build & Deploy

### 1. Build Backend
Since we aren't using Docker, we must build the TS code locally:
```bash
cd backend
npm run build
```

### 2. Deploy Infrastructure
```bash
cd ../smarthire-infra
cdk deploy
```

---

## ⚖️ Comparison: Docker vs Serverless

| Feature | Docker (Fargate) | Serverless (Lambda) |
| :--- | :--- | :--- |
| **Management** | You manage containers. | Fully managed by AWS. |
| **Cost** | Fixed hourly cost (~$20+/mo). | Pay per request (scales to $0). |
| **Scalability** | Scaling takes minutes. | Instant scaling per request. |
| **Queue** | Requires Redis (BullMQ). | Uses native AWS SQS. |
| **Effort** | Requires Docker knowledge. | No Docker needed. |

---

## 💡 Recommendation
Go with **Serverless** for your initial deployment. It's much cheaper for low-to-moderate traffic and doesn't require setting up a continuous Docker build pipeline.
