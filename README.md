# Xwite — Collaboration Hub

## Stack
- Frontend: Next.js 14, TypeScript, Tailwind CSS, Zustand
- Backend: Node.js, Express, TypeScript, Prisma
- Database: PostgreSQL
- Cache/Queue: Redis + BullMQ
- Payments: Razorpay (escrow)
- Realtime: Socket.IO
- AI: Anthropic Claude (agent)
- Monorepo: Turborepo

## Roles
- COMPANY — post jobs, hire, manage escrow
- FREELANCER — bid on tasks, get paid via wallet
- CLIENT — post tasks, skill swap, collaborate

## Getting Started
1. cp .env.example .env
2. npm install
3. npx prisma migrate dev
4. npm run dev

## Build Order
1. prisma/schema.prisma
2. Auth + roles backend
3. Onboarding UI (per role)
4. Feed + post + task system
5. Chat + Socket.IO
6. Escrow + Razorpay
7. AI Agent
