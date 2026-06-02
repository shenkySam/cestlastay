# Tech Stack & Architecture

## Overview

This document outlines the technology choices for the Hotel Management System and the rationale behind each decision.

---

## Architecture Pattern

### Monorepo (Turborepo)

**Decision:** Use Turborepo for monorepo management

**Why?**
- **Code sharing:** Share TypeScript types, validators, and constants between frontend and backend
- **Atomic commits:** Change API contracts and frontend consumers in a single commit
- **Unified CI/CD:** Build and deploy all apps together
- **Simplified development:** Single `pnpm dev` command runs all services
- **Mobile-ready:** Easy to add React Native app later with shared code

**Trade-offs:**
- Larger repository size
- Requires understanding of monorepo concepts
- Worth it for type safety and code reuse benefits

**Structure:**
```
apps/
  ├── api/          # NestJS backend
  ├── web/          # React frontend
  └── mobile/       # React Native (future)
packages/
  ├── shared/       # Shared types and utilities
  ├── ui/           # Shared React components
  └── eslint-config/
```

---

## Backend Stack

### NestJS + TypeScript

**Decision:** Use NestJS over raw Express

**Why?**
- **Enterprise architecture:** Modular structure with dependency injection
- **TypeScript-first:** Full type safety across the stack
- **Built-in features:** Guards, interceptors, pipes for auth and validation
- **WebSocket support:** Native Socket.IO integration via gateways
- **Decorator-based:** Clean, readable code with `@Controller()`, `@Get()`, etc.
- **Testability:** Dependency injection makes unit testing straightforward
- **Scalability:** Easy to add microservices or workers later

**Trade-offs:**
- Steeper learning curve than Express
- More boilerplate code
- Pays off in maintainability for complex business logic

**Alternatives Considered:**
- **Express:** Too minimal, requires manual architecture setup
- **Fastify:** Good performance but smaller ecosystem
- **Koa:** Middleware-focused, lacks structure for large apps

---

## Database

### Supabase (PostgreSQL)

**Decision:** Use Supabase over self-hosted PostgreSQL or other databases

**Why?**
- **Built-in authentication:** JWT token management, email auth, social logins out of the box
- **Row-level security:** Database-level access control policies (bonus feature)
- **Real-time subscriptions:** Listen to database changes (optional enhancement)
- **PostgreSQL underneath:** Can migrate to self-hosted Postgres if needed
- **Free tier:** 500MB database, 2GB bandwidth, 50MB file storage
- **Managed infrastructure:** Zero server maintenance
- **REST API auto-generated:** Direct database queries from frontend if needed

**Trade-offs:**
- Vendor dependency (mitigated by PostgreSQL compatibility)
- Open-source and self-hostable if needed

**Alternatives Considered:**
- **MongoDB:** NoSQL doesn't fit relational booking data well
- **MySQL:** Supabase offers more features for same cost
- **Firebase:** More expensive, less flexible for complex queries
- **Self-hosted PostgreSQL:** Requires infrastructure management

---

## ORM

### Prisma

**Decision:** Use Prisma over other ORMs

**Why?**
- **Type-safe queries:** Auto-generated client with full TypeScript support
- **Schema-first:** Define schema in `schema.prisma`, migrations auto-generated
- **Introspection:** Can generate schema from existing database
- **Developer experience:** Auto-completion, inline documentation
- **Migration system:** Version control for database schema
- **Cross-platform:** Works with PostgreSQL, MySQL, MongoDB, SQL Server

**Trade-offs:**
- Additional abstraction layer (minimal performance impact)
- Requires learning Prisma's query syntax

**Alternatives Considered:**
- **TypeORM:** More mature but verbose decorators
- **Sequelize:** Older, less type-safe
- **Knex.js:** Too low-level, no type safety
- **Raw SQL:** No type safety, error-prone

---

## Frontend Stack

### React + Vite

**Decision:** React with Vite bundler

**Why?**
- **React:** Industry standard, huge ecosystem, job market
- **Vite:** Lightning-fast dev server with HMR (Hot Module Replacement)
- **TypeScript:** Full type safety from API to UI
- **React Router:** Mature routing with role-based protection
- **Context API:** Simple state management for auth
- **Socket.IO client:** Real-time updates from backend

**Alternatives Considered:**
- **Next.js:** Overkill for SPA, SSR not needed
- **Vue.js:** Smaller ecosystem than React
- **Angular:** Too heavy, steeper learning curve
- **Svelte:** Less mature ecosystem

**UI Library:** TBD (Tailwind CSS + Headless UI or Material-UI)

---

## Real-time Communication

### Socket.IO

**Decision:** Use Socket.IO for real-time features

**Why?**
- **Reliability:** Auto-reconnection, message buffering
- **Fallback support:** Works even if WebSocket is blocked (long-polling)
- **Rooms & namespaces:** Easy to broadcast to specific users/groups
- **Large ecosystem:** Well-documented, widely adopted
- **React Native support:** Same client works on mobile
- **NestJS integration:** Built-in `@WebSocketGateway()` decorator

**Trade-offs:**
- More complex infrastructure than polling
- Requires persistent connections (Redis adapter for horizontal scaling)

**Alternatives Considered:**
- **WebSocket (raw):** No fallback, no reconnection logic
- **Server-Sent Events (SSE):** One-way only, no client-to-server
- **Polling:** Inefficient, delays, higher server load

**Use Cases:**
- Real-time room status updates
- Live booking notifications
- Service request alerts
- Housekeeping task updates

---

## Payment Processing

### Stripe

**Decision:** Use Stripe for payment processing

**Why?**
- **Industry standard:** Most trusted payment processor
- **PCI-compliant:** Never touch card data (Stripe Elements handles it)
- **Strong SDKs:** Official libraries for Node.js, React, React Native
- **Webhook support:** Async payment confirmation
- **Test mode:** Fully functional testing without real money
- **Global support:** Multiple currencies, payment methods

**Alternatives Considered:**
- **PayPal:** Less developer-friendly, higher fees
- **Square:** Limited international support
- **Razorpay:** India-focused, good for regional deployment
- **Braintree:** Owned by PayPal, similar limitations

**Integration Pattern:**
- Backend creates `PaymentIntent`
- Frontend uses Stripe Elements (PCI-compliant iframe)
- Webhook confirms payment success
- Never store card details

---

## Email & SMS

### SendGrid + Twilio

**Decision:** SendGrid for emails, Twilio for SMS

**Why SendGrid?**
- **Free tier:** 100 emails/day forever
- **Dynamic templates:** Visual template editor
- **Tracking:** Open rate, click rate, bounce handling
- **Deliverability:** Strong reputation, SPF/DKIM setup
- **API-friendly:** Simple REST API and Node.js SDK

**Why Twilio?**
- **Pay-as-you-go:** No monthly fees, pay per SMS
- **Global reach:** Supports most countries
- **Programmable:** Full API control
- **Reliable:** Enterprise-grade uptime

**Alternatives Considered:**
- **Mailgun:** More expensive, less generous free tier
- **Amazon SES:** Requires AWS setup, more complex
- **Postmark:** No free tier
- **NodeMailer (SMTP):** Low deliverability, likely to land in spam

---

## Deployment

### Vercel (Frontend) + Railway (Backend)

**Decision:** Use Vercel for React app, Railway for NestJS backend

**Why Vercel?**
- **Free tier:** Generous for hobby projects
- **Auto-deployment:** Push to Git, auto-deploy
- **Edge Network CDN:** Globally distributed, fast loading
- **Zero config:** Detects React/Vite automatically

**Why Railway?**
- **Free tier:** $5/month credit (sufficient for MVP)
- **PostgreSQL included:** No separate database hosting needed
- **Auto-deployment:** Git integration
- **Environment variables:** Easy config management
- **WebSocket support:** Unlike some PaaS providers

**Alternatives Considered:**
- **Netlify:** Similar to Vercel, slightly less popular
- **Heroku:** Removed free tier, expensive
- **AWS (EC2 + RDS):** Requires DevOps knowledge, overkill for MVP
- **DigitalOcean:** Good for self-managed VPS but requires more setup

---

## Future Considerations

### Mobile App (React Native)

**Why React Native?**
- **Code sharing:** Share 70-80% of code with React web app
- **Shared API:** Same NestJS backend serves web and mobile
- **Single language:** JavaScript/TypeScript across entire stack
- **Expo:** Rapid development with OTA updates
- **Socket.IO support:** Same real-time events on mobile

**Alternative:** Flutter (requires learning Dart, no code sharing with React)

---

## Development Tools

### Package Manager: pnpm
- Faster than npm/yarn
- Efficient disk space usage (content-addressable storage)
- Built-in monorepo support

### Version Control: Git + GitHub
- Standard in industry
- GitHub Actions for CI/CD

### API Testing: Thunder Client / Postman
- Test endpoints during development

### Database Tool: Prisma Studio
- Visual database browser built into Prisma

---

## Summary

| Layer              | Technology       | Rationale                              |
|--------------------|------------------|----------------------------------------|
| Monorepo           | Turborepo        | Code sharing, atomic commits           |
| Backend Framework  | NestJS           | Enterprise architecture, TypeScript    |
| Database           | Supabase (PostgreSQL) | Managed, free tier, built-in auth |
| ORM                | Prisma           | Type-safe queries, migrations          |
| Frontend           | React + Vite     | Industry standard, fast dev server     |
| Real-time          | Socket.IO        | Reliable, fallback support             |
| Payments           | Stripe           | PCI-compliant, strong SDKs             |
| Email              | SendGrid         | Free tier, good deliverability         |
| SMS                | Twilio           | Pay-as-you-go, reliable                |
| Deployment (Web)   | Vercel           | Free, auto-deploy, CDN                 |
| Deployment (API)   | Railway          | Free tier, PostgreSQL included         |
| Future Mobile      | React Native     | Code sharing with React web            |

This stack prioritizes:
- **Developer experience** (type safety, fast dev server, good tooling)
- **Cost efficiency** (free tiers for MVP)
- **Scalability** (can grow from MVP to production)
- **Mobile readiness** (API design supports future React Native app)
