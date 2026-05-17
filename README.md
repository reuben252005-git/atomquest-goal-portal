# AtomQuest Hackathon 1.0 — Goal Setting & Tracking Portal

## Tech Stack
- **Frontend**: Next.js 14 (TypeScript) + Tailwind CSS
- **Backend**: Node.js + Express + Prisma ORM
- **Database**: PostgreSQL (Supabase free tier)
- **Cache**: Redis (Upstash free tier)
- **Auth**: JWT (+ optional Azure AD / NextAuth)
- **Hosting**: Vercel (frontend) + Railway (backend)

## Project Structure
```
atomquest/
├── frontend/         # Next.js app
│   └── src/
│       ├── components/
│       │   ├── employee/     # Goal creation, check-in forms
│       │   ├── manager/      # Approval workflow, team dashboard
│       │   ├── admin/        # Cycle config, audit logs
│       │   └── shared/       # Navbar, layout, modals
│       ├── pages/            # Next.js pages / App Router
│       ├── hooks/            # Custom React hooks
│       ├── lib/              # API client, auth helpers
│       └── types/            # TypeScript types
│
├── backend/          # Express API
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── src/
│       ├── routes/           # API route handlers
│       ├── services/         # Business logic
│       ├── middleware/        # Auth, validation
│       ├── models/           # Prisma client wrappers
│       └── utils/            # Scoring, helpers
│
└── docs/
    └── architecture.pdf      # Submission diagram
```

## Quick Start

### 1. Clone & install
```bash
git clone <your-repo>
cd atomquest/backend && npm install
cd ../frontend && npm install
```

### 2. Set environment variables
```bash
# backend/.env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
JWT_SECRET="your-secret"
PORT=4000

# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 3. Run database migrations
```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Start dev servers
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## Demo Credentials
| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Employee | employee@demo.com      | Demo@123    |
| Manager  | manager@demo.com       | Demo@123    |
| Admin    | admin@demo.com         | Demo@123    |

## Validation Rules (BRD)
- Total weightage across all goals = 100%
- Minimum weightage per goal: 10%
- Maximum goals per employee: 8
- Goals are locked after manager approval

## Scoring Formulas
| UoM Type | Formula |
|----------|---------|
| Min (higher is better) | Achievement ÷ Target × 100 |
| Max (lower is better)  | Target ÷ Achievement × 100 |
| Timeline               | On-time = 100%, Late = 0% |
| Zero-based             | Achievement = 0 → 100%, else 0% |
