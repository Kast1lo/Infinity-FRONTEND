<p align="center">
  <img src="public/infinityLogo.svg" alt="Infinity" width="90" />
</p>

<h1 align="center">Infinity</h1>

<p align="center">
  All-in-one workspace — Kanban boards and file storage in one minimalist interface.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-21-red?logo=angular&logoColor=white" alt="Angular 21"/>
  <img src="https://img.shields.io/badge/PrimeNG-21-blue?logo=primeng&logoColor=white" alt="PrimeNG 21"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs&logoColor=white" alt="NestJS 11"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Prisma-2d3748?logo=prisma&logoColor=white" alt="Prisma"/>
</p>

---

## Overview

**Infinity** A modern, high-performance web interface for the Infinity Vault SaaS platform. Built with the latest Angular features to ensure a seamless and reactive user experience.

The application is split into two independent services:

| Layer | Stack |
|---|---|
| Frontend | Angular 21 · PrimeNG 21 · TypeScript · SCSS |
| Backend | NestJS 11 · Prisma 7 · PostgreSQL |

---

## Features

### Infinity-life — Kanban Board
- Custom columns with drag-and-drop task reordering
- Tasks with priorities (High / Medium / Low), deadlines, color labels, and descriptions
- Subtasks with an inline progress bar
- Completion toggling with optimistic UI updates

### File Storage
- Upload files and entire folder structures preserving hierarchy
- Inline previews — images, video player, audio player, PDF renderer, Word/Excel viewer, ZIP browser
- Rename, move, and delete files and folders
- Share files via a direct link (copied to clipboard)
- Drag-and-drop upload directly onto the file grid

### User Profile
- Avatar upload with in-app crop tool (CropperJS)
- Username and password change
- Custom application background (persisted per device)
- Storage quota bar and subscription plan info

### Plans & Subscriptions
- **Spark** — 7-day free trial (5 GB, up to 30 tasks)
- **Pulse** — Monthly subscription (250 GB, unlimited tasks)
- **Horizon** — Annual subscription (1 TB, 35% saving)
- **Eternal** — One-time lifetime purchase (1 TB forever)
- Promo code activation

### UX
- Dark / Light theme (PrimeNG Aura preset, custom Zinc palette)
- Russian / English language toggle (persisted in localStorage)
- Cookie-based auth with silent token refresh
- Email verification flow with 6-digit code input
- Fully responsive layout

---

## Project Structure

```
Infinity-frontend/infinity/
├── src/
│   ├── app/
│   │   ├── common-ui/          # Shared layout components (sidebar, main-page)
│   │   ├── i18n/               # Translations (ru / en)
│   │   ├── interfaces/         # TypeScript models
│   │   ├── pages/
│   │   │   ├── auth-pages/     # Login, Registration + email verify
│   │   │   └── main-pages/     # Profile, Edit-profile, File-system, Infinity-life
│   │   ├── pipes/
│   │   └── services/           # Signal-based services (Auth, User, FileSystem, InfinityLife, Plan…)
│   ├── environments/
│   └── styles.scss
├── public/                     # Static assets (logos, icons)
├── nginx.conf                  # Production Nginx config
└── Dockerfile
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Running [Infinity Backend](../Infinity-backend/infinity) on port `4400`

### Install & run

```bash
cd Infinity-frontend/infinity
npm install
npm start
```

The dev server starts on `http://localhost:4200` and proxies all API requests to `localhost:4400`.

### Build for production

```bash
npm run build
```

Output goes to `dist/infinity/browser/`.

### Run tests

```bash
npm test
```

Uses Vitest via `@angular/build:unit-test`.

---

## Deployment

The included `Dockerfile` performs a multi-stage build:

1. **Build stage** — Node 22, runs `npm run build`
2. **Serve stage** — Nginx serves the static bundle from `dist/infinity/browser`

```bash
docker build -t infinity-frontend .
docker run -p 80:80 infinity-frontend
```

`nginx.conf` is configured for Angular routing (`try_files $uri $uri/ /index.html`).

---

## Environment

| Variable | Dev | Prod |
|---|---|---|
| API base URL | `http://localhost:4400` | `https://api.infinity-vault.com` |

Set in `src/environments/environment.ts` and `environment.prod.ts`.

---

## Tech Highlights

- **Angular signals** throughout — no RxJS BehaviorSubjects in services; all state is `signal()` / `computed()`
- **Standalone components** — no NgModules anywhere
- **OnPush change detection** on every component
- **Functional HTTP interceptor** — silent 401 refresh with a single retry per request
- **CropperJS** integration for client-side avatar cropping
- **CDK Drag & Drop** for Kanban column reordering
- **pdf.js**, **mammoth**, **XLSX**, **JSZip** loaded from CDN for file previews without bloating the bundle
