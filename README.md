\# SmartRetry AI



AI-powered revenue recovery for failed payments — built for the Razorpay AI Buildathon 2026 (Track 03: AI Revenue Recovery).



\## The problem



I pay ₹350/month for health insurance through Navi, due on the 10th with grace till the 25th. My autopay once failed from a bank timing glitch, not lack of funds. Navi's system just kept silently retrying without ever explaining why, or letting me pay myself. I nearly lost coverage over a bug, not a choice.



This is involuntary churn: a customer who wanted to pay, had the money, but a technical hiccup killed the transaction. Most systems either do nothing or retry blindly with no intelligence behind it. Razorpay processes payments for around 5 million merchants, including names like BookMyShow, Airtel, Zomato, and Ola — even a small share of recoverable failures adds up to real money industry-wide.



\## What it does



\- Classifies failures using Indian banking/NPCI-style error codes: `ERR\_BANK\_TIMEOUT`, `INSUFFICIENT\_FUNDS`, `EXPIRED\_VPA\_REQUEST`, `LIMIT\_EXCEEDED`

\- Scores recovery confidence from error type, amount, bank health, timing, and history

\- Runs a transparent, seven-step decision trace per transaction: DETECT → DIAGNOSE → ANALYZE → DECIDE → SAFETY\\\_CHECK → EXECUTE → VERIFY

\- Takes the right action: silent retry for bank-side glitches, or a reason-first customer message with a real Razorpay payment link for anything needing customer input

\- Only counts revenue as recovered after actual payment confirmation (webhook or manual verify), not on retry alone

\- Enforces a hard 3-retry cap per transaction and a per-bank circuit breaker (trip/reset) to stop retries during a real outage

\- Surfaces everything on a multi-page dashboard: Dashboard, Analytics, Recovery Queue, Audit Log, Circuit Breakers



\## Tech stack



Node.js, Express, MongoDB Atlas, React (Vite), Razorpay Payment Links API.



\## Architecture



Failed payment → Error Classifier → Confidence Scoring → Decision Engine → either silent retry (bank-side issue) or customer message + real payment link (needs action) → payment confirmed via webhook/manual verify → marked Recovered. Every step is logged to a per-transaction audit trail and a shared circuit breaker registry.



\## Product walkthrough



\### Dashboard

!\[SmartRetry AI Dashboard](./screenshots/dashboard.png)



\### Recovery Queue

!\[Recovery Queue](./screenshots/recovery-queue.png)



\### Analytics

!\[Analytics](./screenshots/analytics.png)



\### Audit Log

!\[Audit Log](./screenshots/audit-log.png)



\### Circuit Breakers

!\[Circuit Breakers](./screenshots/circuit-breakers.png)











\## Why it's not a single-shop tool



Built as backend infrastructure any merchant could plug into, not a one-off dashboard for one business. The same engine recovering a ₹350 insurance premium works identically for a ₹15,000 order. This build's dashboard represents one merchant's view; the engine is designed to generalize.



\## Known limitations



\- WhatsApp delivery isn't live — Twilio requires an approved Content Template even for sandbox messages, and template approval needs a paid subscription. Generated messages (with real Razorpay links) are shown directly on the dashboard instead.

\- Razorpay test-mode rate limits can cause a `429` on a subset of transactions during a full batch run; individual retries reliably succeed.

\- Seed data is randomly generated; production would use real Razorpay webhook events.



\## Running locally



```bash

\# Backend

cd backend

npm install

node seed.js

node server.js



\# Frontend

cd frontend

npm install

npm run dev



```



Requires `backend/.env` with `MONGO\_URI`, `PORT`, `RAZORPAY\_KEY\_ID`, `RAZORPAY\_KEY\_SECRET`.



\## Author



Built by Mohan, for the Razorpay AI Buildathon 2026. 

