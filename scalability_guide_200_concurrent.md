# Scaling Guide: Supporting 200 Concurrent Users

Testing 200 candidates simultaneously puts significant load on your **Database connections** and **Real-time proctoring** data flow. Follow these configurations to ensure a smooth, lag-free experience.

---

## 🏗️ 1. Computing Resources (Backend)

### Option A: ECS Fargate
To handle 200 concurrent active sessions:
- **Task Count:** 2 to 4 running tasks (for redundancy).
- **CPU/RAM per Task:** `1 vCPU` and `2GB RAM`.
- **Auto-Scaling:** Set a trigger to add a task if CPU usage > 60%.

### Option B: AWS Lambda
- **Reserved Concurrency:** None needed (standard limit is 1,000), but ensure you have an **RDS Proxy** (see below).

---

## 🗄️ 2. Database Scaling (The Architecture Bottle-Neck)

The biggest risk with 200 concurrent users is **Database Exhaustion**. Every candidate's "Watcher Overlay" sends heartbeats and proctoring status every few seconds.

### ✅ Solution: RDS Proxy
You **MUST** use RDS Proxy. It acts as a pool for database connections.
- Without Proxy: 200 Lambda calls = 200 DB connections (PostgreSQL might crash).
- With Proxy: 200 Lambda calls = ~20 persistent DB connections.

### ✅ Database Sizing (Aurora Serverless v2)
- **Minimum:** `1.0 ACU` (This ensures the DB is "warm" before the test starts).
- **Maximum:** `4.0 ACU` (This provides enough headroom for AI processing and heavy writes).

---

## ⚡ 3. Real-Time Performance (WebSocket / Hearts)

If you use **Socket.io** for the live recruiter monitor:
- On AWS, use **AWS AppSync** or **AWS API Gateway WebSockets**. Standard ALB-based WebSockets require "Sticky Sessions" (Session Affinity) to be enabled on the load balancer.

---

## 🛡️ 4. Frontend Resilience (S3 + CloudFront)

- **TTL (Time to Live):** Set your CloudFront object cache to at least 10 minutes. This ensures that 200 candidates are downloading the React `dist` assets from the Edge locations, never the S3 bucket itself.
- **WAF (Web Application Firewall):** Enable **AWS WAF** to protect against DDoS if 200 candidates are hitting the site at the exact same second.

---

## 📋 Checklist for 200 Users Launch day

1.  [ ] **Warm the DB Proxy:** Ensure the proxy is active 10 minutes before the test window.
2.  [ ] **Check Groq/OpenAI Limits:** Ensure your AI API key has "Tier 2" limits or higher. 200 concurrent evaluations might hit **Rate Limits (RPM/TPM)** on the AI side.
3.  [ ] **CDN Check:** Invalidate CloudFront cache after your final deployment so all 200 users have the latest version.
4.  [ ] **Log Monitoring:** Open **CloudWatch Logs** to monitor for `ETIMEDOUT` errors in the backend.

---

### 💰 Cost Est. for 200 Concurrent Users window:
- **Compute:** ~$2 - $5 / day 
- **Database:** ~$3 / day
- **Total:** For a 30-day assessment window with daily 200-person cohorts, expect around **$150 - $200 / month**.
