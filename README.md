# Meta Social Manager

> Production-ready Instagram Analytics Dashboard built using Meta Graph API, React, TypeScript, Express, and TailwindCSS.

![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)
![React](https://img.shields.io/badge/Frontend-React_18-blue.svg)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)
![TailwindCSS](https://img.shields.io/badge/Styling-TailwindCSS-38bdf8.svg)
![Express](https://img.shields.io/badge/Backend-Express.js-green.svg)

---

## 🚀 Overview

**Meta Social Manager** is a SaaS-grade Instagram Analytics Dashboard similar to Metricool, Hootsuite, and Meta Business Suite. It enables users to connect an Instagram Business or Creator account using a single Meta Graph API Access Token and automatically analyzes profile stats, media performance, reach trends, format breakdowns, and AI-driven recommendations.

---

## ✨ Features

- 🔑 **Automatic Page & Account Discovery**: Paste a single token -> auto-discovers connected Facebook Pages and Instagram Business Accounts.
- 👤 **Profile Card**: Displays profile picture, handle, bio, follower/following/post counts, account ID, page ID, and connection timestamp.
- 📊 **14 Live & Computed Stat Cards**: Real-time stats for Followers, Following, Posts, Reach, Total Likes, Total Comments, Total Engagement, Shares, Saves, Images, Videos, Carousels, Reels, Engagement Rate %, and Posts/Month.
- 🏆 **Top Performing Content Highlight**: Automatically detects and displays your Most Liked, Most Commented, Top Engaged, and Latest posts with direct Instagram links.
- 🖼️ **Interactive Media Grid**: Search captions, filter by format (Image, Video, Carousel, Reel), filter by date range (7d, 30d, 90d, All), and sort by likes/comments/newest.
- 📈 **Visual Analytics**: Interactive Recharts for Reach trends, Follower growth, Engagement trends, Likes/Comments per post, and Media Distribution Pie Chart.
- 💡 **AI Smart Recommendations Engine**: Rule-based engine analyzing engagement rate, format mix, posting cadence, and short-form video optimization.
- 📥 **One-Click CSV Export**: Download complete reports containing profile metadata, calculated metrics, and post details.
- 🔒 **Privacy First**: Zero access tokens stored on the server; all tokens held transiently in client memory.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React, Sonner
- **Backend**: Node.js, Express, Axios, CORS, dotenv
- **API**: Meta Graph API (v21.0+)

---

## 📁 Repository Structure

```text
Meta-Social-Manager/
├── client/                   # Frontend React + Vite app
│   ├── src/
│   │   ├── components/       # UI Components (ProfileCard, StatsGrid, MediaGrid, etc.)
│   │   ├── constants/        # API endpoints and chart color configurations
│   │   ├── hooks/            # Custom hooks (useAnimatedCounter, etc.)
│   │   ├── services/         # Axios API service calls
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # Analytics calculators & CSV exporter
│   ├── package.json
│   └── vite.config.ts
├── server/                   # Backend Express proxy
│   ├── src/
│   │   ├── routes/           # Meta API proxy endpoints (/api/meta/*)
│   │   ├── utils/            # Meta Graph API Axios helper
│   │   └── index.ts          # Express server entry point & static server
│   └── package.json
├── .env.example              # Sample environment variables
├── package.json              # Monorepo build scripts
├── render.yaml               # Render.com cloud deployment config
├── vercel.json               # Vercel cloud deployment config
└── README.md
```

---

## ⚡ Quick Start & Running Locally

### Prerequisites
- Node.js >= 18.x
- npm >= 9.x
- A valid Meta Graph Access Token with `instagram_basic`, `instagram_manage_insights`, and `pages_read_engagement` permissions.

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/omkar2117/Meta-Social-Manager.git
   cd Meta-Social-Manager
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` in both `client/` and `server/` directories:
   ```bash
   cp .env.example server/.env
   ```

4. **Build production assets**:
   ```bash
   npm run build
   ```

5. **Start development servers**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5174` (or `http://localhost:5173`) in your browser.

---

## 📡 API Documentation

### Backend Endpoints (`http://localhost:3001`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint returning server status |
| `POST` | `/api/meta/validate` | Validates access token and returns user details |
| `POST` | `/api/meta/pages` | Fetches connected Facebook Pages |
| `POST` | `/api/meta/instagram-account` | Auto-discovers linked Instagram Business Account |
| `POST` | `/api/meta/instagram-profile` | Retrieves Instagram profile data |
| `POST` | `/api/meta/instagram-media` | Retrieves recent feed media items (limit: 30) |
| `POST` | `/api/meta/instagram-insights` | Queries supported Meta insight metrics |
| `POST` | `/api/meta/connect` | Full single-request connection flow pipeline |

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](./LICENSE) for details.
