# Project Context — Thabiso Collin Sengane

## Owner
- **Name:** Thabiso Collin Sengane
- **Location:** Durban, KwaZulu-Natal, South Africa
- **Contact:** thacollin2@gmail.com | 067 977 9340 | WhatsApp: https://wa.me/27679779340
- **GitHub:** ThabisoCollinSengane/portfolio
- **Deployed:** https://thacollin2-gmailcoms-projects.vercel.app (Vercel, Hobby plan)

## Business — Two Divisions, One Brand

This is a combined **Web Development + Cybersecurity** services business targeting SMEs in Durban/KZN, South Africa. There are almost no competitors in Durban doing both.

### Division 1: Web Development
Services:
- Starter business site (R4,500) — 4–6 pages, mobile, SEO, contact form
- E-commerce store with PayFast/Ozow (R12,000–R18,000)
- Booking system sites (R8,000–R14,000)
- Landing pages (R2,500) — 48hr turnaround
- Website redesigns (R5,000–R10,000)
- Managed secure hosting via cPanel reseller (R350–R800/month)
- SEO packages (R1,500–R3,500)

### Division 2: Cybersecurity
Services:
- Web application security audit (R3,500–R12,000) — Nikto, Burp Suite, OWASP ZAP
- POPIA compliance audit (R5,000–R15,000) — SA data protection law
- Network penetration test (R10,000–R35,000) — Nmap, Metasploit
- Phishing simulation (R4,000–R12,000) — GoPhish
- WiFi security audit (R2,500–R6,000) — Aircrack-ng, Wifite
- Security awareness training (R800–R1,500/person)
- Monthly security monitoring (R2,500–R6,000/month recurring)
- Secure website build — web dev + security combined (R6,000–R20,000)

### Key Differentiator
Only provider in KZN that builds websites AND audits/secures them. AI-assisted delivery = faster turnaround than any competitor. POPIA compliance angle is a strong SA-specific selling point.

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (no framework) — single-page or multi-page
- **Hosting:** Vercel (free tier) for own sites; cPanel reseller for client sites
- **Database:** Supabase (PostgreSQL) — project ID: cjzewfvtdayjgjdpdmln
- **Forms:** Direct Supabase REST API calls (anon key, RLS insert-only)
- **Email:** Resend API (free tier)
- **Payments:** PayFast / Ozow (SA-specific)
- **Security tools:** Kali Linux VM — Burp Suite, Nmap, Metasploit, Nikto, GoPhish, OWASP ZAP, Aircrack-ng

## Owned Test Targets (Authorized Pentesting)
- **pulsify.co.za** — owned by Thabiso, authorized for all security testing
- **mzansiacademysa.co.za** — owned by Thabiso, authorized for all security testing

## Current Files
- `index.html` — Portfolio/freelance site (dark theme, already deployed)
- `leads.html` — Lead scraper dashboard (reads from Supabase leads table)
- `api/scrape-leads.js` — Vercel serverless function, scrapes Reddit/HN/Gumtree SA/LinkedIn Jobs every 6h via cron-job.org
- `vercel.json` — Vercel config (rewrites only, no cron — Hobby plan limitation)
- `.env.example` — Required env vars for scraper

## Supabase Tables
- `contact_submissions` — form leads from portfolio site (RLS: public insert)
- `leads` — scraped job/hire leads (RLS: service role only; unique constraint on url)

## Env Vars (set in Vercel dashboard)
- `SUPABASE_URL` — https://cjzewfvtdayjgjdpdmln.supabase.co
- `SUPABASE_SERVICE_KEY` — service role key
- `RESEND_API_KEY` — Resend email API
- `LEADS_EMAIL` — dedicated leads-only email (NOT thacollin2@gmail.com — that's connected to Fiverr/Upwork)
- `SCRAPER_TOKEN` — protects /api/scrape-leads endpoint

## Cybersecurity Reference Library (Google Drive — "Ethical hacking security" folder)
Four books available for cross-referencing techniques:

1. **Gray Hat Hacking: The Ethical Hacker's Handbook (3rd Ed.)** — Allen Harper et al.
   - Covers: ethical disclosure, pentest methodology, social engineering (Ch.4), Metasploit (Ch.8), pentest management (Ch.9), web app vulnerabilities (Ch.17), shellcode, Windows/Linux exploits
   - Most relevant for: client pentesting engagements, web app audits, methodology

2. **Hacking: The Art of Exploitation (2nd Ed.)** — Jon Erickson
   - Covers: C programming for exploitation, buffer overflows, shellcode, networking attacks, cryptology, countermeasures
   - Most relevant for: deep technical exploit development (advanced, long-term)

3. **Kali Linux Revealed (2021 Ed.)** — Raphaël Hertzog et al. (official Offensive Security book)
   - Covers: Kali installation and configuration, forensics mode, tool ecosystem, ARM devices
   - Most relevant for: setting up and managing Kali VM correctly

4. **Linux Basics for Hackers** — OccupyTheWeb
   - Covers: Linux fundamentals, network analysis, bash scripting, wireless networks (Ch.14), logging (Ch.11), Python scripting (Ch.17)
   - Most relevant for: foundation skills, automation scripts, WiFi auditing

## Design System
- **Theme:** Dark — bg `#0a0a0f`, accent gradient `linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)`
- **Font:** System UI stack
- **Style:** Premium dark SaaS aesthetic, not corporate — bold gradients, glassmorphism cards

## Git
- **Branch for new work:** `claude/freelancer-portfolio-site-j8u81d`
- **Main branch:** `main`
- Always commit with attribution lines per session reminder

## Business Challenge
Finding clients/customers is the hardest part. Lead scraper helps passively. Active strategies to build:
- Local Durban networking (CPFs, business chambers, BNI)
- Google My Business listing
- POPIA compliance urgency as a conversation starter
- Free first audit offer to get first testimonials
