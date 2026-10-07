# 🚀 ReachInbox Full-Stack Email Job Scheduler & Dashboard

A production-grade distributed email scheduling service and real-time dashboard built for **ReachInbox.ai**. Built with **TypeScript**, **Next.js 15+ & Express.js**, **BullMQ**, **Redis 7.0**, **PostgreSQL (PGlite / ACID Relational DB)**, **Ethereal Fake SMTP**, and **Slack Alert Webhooks**.

---

## 📑 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Key Features & Assignment Mapping](#-key-features--assignment-mapping)
3. [Scheduler & Concurrency Mechanics](#-scheduler--concurrency-mechanics)
4. [Rate Limiting & Slack Alert System](#-rate-limiting--slack-alert-system)
5. [Server Restart Persistence & Idempotency](#-server-restart-persistence--idempotency)
6. [Getting Started (Local & Production Setup)](#-getting-started)
7. [Environment Variables](#-environment-variables)
8. [Demo Walkthrough & Test Scenarios](#-demo-walkthrough--test-scenarios)
9. [Trade-offs & Assumptions](#-trade-offs--assumptions)

---

## 🏛 Architecture Overview

```
                      +-----------------------------+
                      |   Next.js 15 + React UI     |
                      |   (Google Auth, Dashboard)  |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                     |                     |
     [POST /api/schedule]  [GET /api/scheduled]   [GET /api/sent]
               |                     |                     |
               v                     v                     v
      +---------------------------------------------------------+
      |       Express / Next.js Node.js Application Layer       |
      +----------------+-------------------+--------------------+
                       |                   |
                       v                   v
      +-------------------------+  +----------------------------+
      |  BullMQ Delayed Queue   |  |   PostgreSQL Relational    |
      | (Redis 7 Sorted Sets)   |  |  (PGlite ACID Persistence) |
      +------------+------------+  +--------------+-------------+
                   |                              |
                   v                              |
      +-------------------------+                 |
      |   BullMQ Worker Pool    |<----------------+
      |   (Configurable Nx)     | (Idempotency check)
      +------------+------------+
                   |
       +-----------+-----------+
       |                       |
       | Rate Limit Safe?      | Rate Limit Hit?
       v                       v
+------------------+   +------------------------------+
| Ethereal SMTP    |   | 1. Reschedule to next window |
| (Fake Send +     |   | 2. Post Slack Incident Alert |
|  Preview URL)    |   | 3. Zero jobs dropped/lost    |
+------------------+   +------------------------------+
```

---

## 🎯 Key Features & Assignment Mapping

### Backend Requirements

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **No Cron Jobs** | Pure BullMQ delayed jobs (`{ delay: targetTime - now }`) backed by Redis Sorted Sets. No `node-cron`, `agenda`, or OS cron. | ✅ Complete |
| **Persistent Relational DB** | PostgreSQL relational database (`campaigns`, `scheduled_emails`, `sent_emails`, `slack_integrations`, `sender_rate_limits`). | ✅ Complete |
| **Persistence on Restart** | If server stops and restarts, delayed jobs remain in Redis and are reconciled with PostgreSQL. Future emails still send at the exact scheduled time without re-sending past jobs. | ✅ Complete |
| **Multi-Sender Support** | Campaigns can dispatch from multiple distinct senders (`outreach@reachinbox.ai`, `growth@reachinbox.ai`, or custom senders). | ✅ Complete |
| **Ethereal Fake SMTP** | Uses `nodemailer` with dynamic test accounts. Generates real preview URLs (`nodemailer.getTestMessageUrl`). | ✅ Complete |
| **Configurable Worker Concurrency** | Configurable thread pool (`WORKER_CONCURRENCY=5`). Safe concurrent job processing. | ✅ Complete |
| **Minimum Delay Between Emails** | Configurable per-campaign and global (`MIN_DELAY_BETWEEN_EMAILS_SEC=2`). Uses atomic Redis cooldown timestamps per sender. | ✅ Complete |
| **Hourly Rate Limiting** | Redis atomic counter per hour window (`ratelimit:sender:{email}:{YYYY-MM-DD-HH}`). Jobs that exceed the cap are **automatically deferred to the next hour window** (zero job loss). | ✅ Complete |
| **Live Slack Rate-Limit Alerts** | When an hourly limit is hit, dispatches a real formatted Slack message with sender details and rescheduled job count. | ✅ Complete |
| **Elasticsearch-Grade Search** | Fast tokenized search across recipients, senders, subjects, and email bodies via `/api/emails/search`. | ✅ Complete |
| **Live BullMQ Dashboard** | Official `@bull-board/express` dashboard accessible at `/admin/queues` + in-app telemetry monitor. | ✅ Complete |

### Frontend Requirements

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **Google Login** | Header displays user name ("Nikhil K"), email (`nk10nikhil@gmail.com`), avatar, and logout/switch account options. | ✅ Complete |
| **Main Dashboard** | Matches modern ReachInbox aesthetic with tabs for **Scheduled Emails**, **Sent Emails**, and **BullMQ Queue**. | ✅ Complete |
| **Compose New Email** | Modal with subject, body, sender selector, lead list upload (CSV/TXT parser detecting valid email counts), start time picker, delay, and hourly limit. | ✅ Complete |
| **Scheduled Emails Table** | Clean table with recipient, sender, subject, scheduled time countdown ("in 2 mins"), limits, and status badges with loading skeleton and empty state. | ✅ Complete |
| **Sent Emails Table** | Clean table with recipient, sender, subject, sent timestamp, delivery status, and direct **Ethereal preview link / modal**. | ✅ Complete |
| **Slack Integration UI** | Connect Slack modal with live test alert sender and status indicators. | ✅ Complete |

---

## ⚡ Scheduler & Concurrency Mechanics

### Why BullMQ Delayed Jobs Instead of Cron?
- Traditional cron polling inspects the database every minute, which creates database locking contention and millisecond inaccuracies under load.
- BullMQ leverages Redis **Sorted Sets (`zset`)** with timestamps as scores. Redis atomically moves jobs from the `delayed` set to the `waiting` set the millisecond their delay expires.
- Concurrency is managed via BullMQ Worker threads with an atomic mutex, guaranteeing that multiple workers do not pick up the same job.

### Minimum Delay Between Individual Sends
- Standard email providers (Google Workspace, Outlook, SendGrid) flag sudden bursts of emails sent in the exact same second.
- We enforce a minimum delay (default: **2 seconds**) using Redis cooldown timestamps:
  ```ts
  const cooldownKey = `cooldown:sender:${senderEmail}`;
  // Read last send timestamp; if elapsed < delayMs, pause for remainder
  ```

---

## 🛡 Rate Limiting & Slack Alert System

### How Hourly Limits are Enforced:
1. Hourly windows are bucketed by `YYYY-MM-DD-HH` (e.g. `2026-10-07-08`).
2. An atomic Redis `INCR` command tracks the send count for `ratelimit:sender:{senderEmail}:{hourWindow}` with a 2-hour TTL.
3. If `currentCount > hourlyLimit`:
   - The job is **not dropped or marked failed**.
   - The worker calculates the milliseconds until the top of the next hour window (`nextHourDelayMs`).
   - The job is re-added to BullMQ with `{ delay: nextHourDelayMs }` and marked as `delayed (Rate Limit)` in the relational database.
   - **Slack Notification**: At the exact threshold crossing, the backend calls the configured Slack Incoming Webhook / Bot API and delivers an incident alert card.

---

## 🔄 Server Restart Persistence & Idempotency

### Guaranteeing Zero Lost Jobs:
1. When jobs are added, they are written to:
   - **PostgreSQL** (`scheduled_emails` table with status `'scheduled'`).
   - **Redis** BullMQ delayed queue with unique `jobId: email.id`.
2. On startup / restart:
   - Redis automatically retains all delayed sorted-set members on disk (AOF / RDB persistence).
   - The backend runs `reconcileScheduledJobsOnBoot()`: scans PostgreSQL for any pending emails that need queue verification.
   - If Redis lost an in-memory job during a hard crash, it is seamlessly re-enqueued with the remaining delay (`targetTime - now`).
3. **Idempotency Guard**:
   - Before any email is sent, the worker queries PostgreSQL. If the status is already `'sent'`, the worker returns `{ status: 'skipped' }`.

---

## 🛠 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 & 22)
- Redis server (`redis-server`)

### 1. Clone & Install Dependencies
```bash
git clone <repository_url>
cd reachinbox-email-scheduler
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
Key variables:
- `REDIS_HOST=127.0.0.1`
- `REDIS_PORT=6379`
- `WORKER_CONCURRENCY=5`
- `MIN_DELAY_BETWEEN_EMAILS_SEC=2`
- `MAX_EMAILS_PER_HOUR=200`
- `SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."`

### 3. Run Redis Server
```bash
# macOS (Homebrew)
brew services start redis

# Linux (Debian/Ubuntu)
service redis-server start

# Docker alternative
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

### 4. Start the Application
```bash
# Development (Next.js + BullMQ + Express)
npm run dev

# Or run full-stack Express server
npm run build
npm start
```
The application will be live at:
- Frontend & API: `http://localhost:3000`
- Official BullMQ Dashboard: `http://localhost:3000/admin/queues`

---

## 🧪 Demo Walkthrough & Test Scenarios

### Scenario 1: Scheduling Staggered Emails
1. Click **"+ Compose Email"**.
2. Click the preset: **"Standard 3 Leads (2s delay)"**.
3. Select Start Time: **Immediately**.
4. Click **"Schedule 3 Email(s)"**.
5. Switch between **"Scheduled Emails"** and **"Sent Emails"** tabs: watch jobs count down, transition to `Processing`, and then deliver with Ethereal SMTP links!

### Scenario 2: Hourly Rate Limit & Slack Alert Demo
1. In the top bar, click **"Slack"** and enter your Slack webhook URL (or click "Send Live Test Alert").
2. Click **"+ Compose Email"** and select preset: **"Rate Limit Demo"** (6 leads, cap of 3 per hour).
3. The first 3 emails will send immediately.
4. The 4th, 5th, and 6th emails will hit the hourly cap:
   - They will be automatically rescheduled to the next hour window (`Delayed (Rate Limit)`).
   - An alert will instantly ping your Slack channel!

### Scenario 3: Server Restart Persistence
1. Schedule a campaign set to start **In 5 Minutes**.
2. In the **"BullMQ Queue"** tab, click **"Simulate Server Restart"** (or stop and restart the process via terminal).
3. Observe that all delayed jobs remain in the queue with their original execution timestamps intact.

---

## ⚖️ Trade-offs & Assumptions

1. **Relational Database**: Implemented using `@electric-sql/pglite` (Pure PostgreSQL 16 engine running in Node.js with persistent disk storage). Provides standard PostgreSQL SQL queries, transactions, and relational constraints without needing a separate daemon installation.
2. **Ethereal Test Accounts**: Automatically generated on initialization using `nodemailer.createTestAccount()`. Real email bodies and HTML templates are dispatched to Ethereal SMTP with verified preview URLs.
3. **Slack Webhooks**: We support standard Slack Incoming Webhook URLs (`https://hooks.slack.com/services/...`), which can be pasted directly or authorized via Slack Apps.
