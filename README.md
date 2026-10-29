# SentinelDDoS — DDoS Detection & Mitigation Platform

An enterprise-grade, production-quality DDoS detection and mitigation system built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Features

- **Real-time Traffic Monitoring** — live requests, packets, bandwidth, unique IPs
- **11 Detection Techniques** — threshold, rate, signature, behavior, entropy, protocol, spike, adaptive, geo, header, bot
- **Automated Mitigation** — block, rate-limit, challenge, temp/permanent ban, geo-block, drop, traffic shaping
- **10 Attack Simulation Types** — HTTP/GET/POST Flood, SYN/UDP/ICMP Flood, Slowloris, DNS Amplification, Bot, Burst
- **Analytics Dashboard** — line/bar/donut charts, heatmap, gauges, sparklines
- **Audit Logging** — immutable audit trail with CSV/JSON export
- **Reports** — 6 report types with CSV/JSON/print export
- **Role-Based Access** — admin, analyst, viewer roles
- **Settings** — detection sensitivity, geo-blocking, IP whitelist, notifications

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS (dark cybersecurity theme)
- **Icons:** lucide-react
- **Backend/Database:** Supabase (PostgreSQL + Auth + RLS)
- **Charts:** Custom SVG components (no external chart library)

## Quick Start

### 1. Open the folder in VS Code

```bash
code /tmp/cc-agent/68644768/project
```

Or open VS Code → File → Open Folder → select the `project` folder.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the dev server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

### 4. Create your account

1. On the sign-in page, click **"Create one"** to register.
2. Enter any email, password (min 6 chars), and display name.
3. Click **Create Account** — you're signed in automatically.

### 5. Launch an attack simulation

1. Open **Attack Simulator** from the sidebar.
2. Choose an attack type (e.g., HTTP Flood).
3. Set duration and requests/second.
4. Click **Launch Attack**.
5. Watch the Dashboard detect and mitigate in real time.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

## Project Structure

```
project/
├── src/
│   ├── components/
│   │   ├── charts/      # Custom SVG charts (Line, Bar, Donut, Gauge, Heatmap)
│   │   ├── layout/      # Sidebar, Topbar
│   │   └── ui/          # Reusable UI primitives (Card, Button, Badge, etc.)
│   ├── context/         # Auth + Toast contexts
│   ├── engine/          # Traffic & detection engine
│   ├── hooks/           # useEngine hook (engine ↔ React bridge)
│   ├── lib/             # Supabase client, utils, constants
│   ├── pages/           # 11 dashboard pages
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Root component with routing
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles + theme
├── supabase/
│   └── migrations/      # Database schema (applied via Supabase MCP)
├── .env                 # Supabase credentials (pre-configured)
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Database

The Supabase database is already provisioned and the schema migration has been applied. The `.env` file contains pre-populated credentials — no manual configuration needed.

Tables created:
- `profiles` — user profiles with roles
- `attacks` — detected DDoS events
- `blocked_ips` — blocked/rate-limited IPs
- `mitigation_rules` — configurable detection rules
- `alerts` — real-time notifications
- `audit_logs` — immutable audit trail
- `settings` — per-user configuration
- `simulations` — attack simulation history
- `traffic_metrics` — time-series traffic data

All tables have Row Level Security (RLS) enabled with owner-scoped policies.

## Usage Guide

### Dashboard
The main overview page showing live traffic, threat score, server health, top attackers, recent attacks, and alerts.

### Live Traffic
Real-time request stream with filtering (all/blocked/flagged), bandwidth chart, and geographic distribution.

### Attacks
Searchable/filterable log of all detected attacks. Export to CSV. Filter by type and severity.

### Mitigation
Two tabs:
- **Blocked IPs** — view, release, or whitelist blocked IPs. Manually block an IP.
- **Mitigation Rules** — create, edit, enable/disable, and delete detection rules.

### Attack Simulator
Launch simulated DDoS attacks against the demo app. Configure attack type, target, concurrency, duration, and RPS. View live run stats and simulation history.

### Analytics
Traffic trends, attacks by type/severity/country, 7×24 attack heatmap, and mitigation rate.

### Logs & Audit
Immutable audit trail of all system and user actions. Filter by actor and search. Export to CSV.

### Reports
6 report types: Attack Summary, Mitigation Summary, Blocked IPs, Traffic, System Health, Threat Intelligence. Export as CSV, JSON, or print to PDF.

### Users
Manage user accounts and roles (admin/analyst/viewer). Create new users.

### Settings
Configure detection sensitivity, auto-mitigation, rate limits, block duration, geo-blocking, IP whitelist, notifications, and theme.

### Protected App
A demo e-commerce site that the system monitors in real time. Click "Simulate Attack" to see detection and mitigation in action.

## Troubleshooting

- **Blank page?** Check browser console. Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Can't sign in?** Register first — click "Create one" on the sign-in page.
- **No data?** The engine starts automatically — wait a few seconds for traffic samples.
- **Port in use?** Vite auto-selects the next available port — check terminal output.

## License

This is a demonstration project for educational purposes.
