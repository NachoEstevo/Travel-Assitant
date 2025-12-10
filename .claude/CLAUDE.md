# PersonalTravel - Claude Code Instructions

## Project Overview

Personal flight search application with AI-powered natural language queries, multi-city route optimization, price tracking, and automated alerts. Built as a single-user personal tool with a beautiful editorial travel magazine aesthetic.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Database**: PostgreSQL + Prisma 7 ORM
- **Auth**: Simple password with iron-session (single-user)
- **UI**: shadcn/ui + Tailwind CSS v4 (Editorial Travel Magazine theme)
- **Flight APIs**: Amadeus (production API)
- **AI**: OpenAI gpt-4o-mini for NLP parsing
- **Email**: Resend for notifications
- **Telegram**: Bot notifications for price alerts
- **Animations**: Framer Motion

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected routes (home, tasks, history, settings, chat)
│   ├── api/
│   │   ├── auth/        # Login/logout endpoints
│   │   ├── airports/    # Airport search endpoint
│   │   ├── alerts/      # Price alerts CRUD
│   │   ├── chat/        # Chat history API
│   │   ├── cron/        # Scheduled task runner
│   │   ├── history/     # Search history API
│   │   ├── tasks/       # Scheduled tasks CRUD
│   │   └── flights/
│   │       ├── search/         # Manual flight search
│   │       ├── search-natural/ # AI-powered natural language search
│   │       └── compare-routes/ # Multi-city route comparison
│   └── login/           # Public login page
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # App layout (navbar)
│   ├── flights/         # Flight-specific components
│   │   ├── flight-card.tsx
│   │   ├── flight-card-skeleton.tsx
│   │   ├── flight-results-list.tsx
│   │   ├── flight-search-form.tsx
│   │   ├── route-comparison.tsx
│   │   ├── search-progress.tsx
│   │   └── airport-search.tsx
│   └── tasks/           # Task management components
│       ├── task-card.tsx
│       ├── task-form.tsx
│       ├── task-detail-dialog.tsx
│       └── price-chart.tsx
└── lib/
    ├── auth.ts          # Authentication helpers
    ├── db.ts            # Prisma client (lazy-loaded)
    ├── utils.ts         # Utility functions
    ├── amadeus.ts       # Amadeus API service
    ├── openai.ts        # OpenAI NLP service
    ├── scheduler.ts     # Task scheduler service
    ├── notifications.ts # Notification coordination
    ├── resend.ts        # Email service
    ├── telegram.ts      # Telegram bot service
    ├── multi-city.ts    # Multi-city route optimization
    ├── stopovers.ts     # Stopover hub database
    ├── saved-searches.ts # Saved searches utility
    ├── flight-export.ts # ICS/clipboard export
    └── cron-utils.ts    # Cron expression utilities
```

## Coding Conventions

### API Routes
- Use Zod for request/response validation
- Return consistent JSON structure: `{ success, data?, error? }`
- Handle errors with proper HTTP status codes
- Log errors but don't expose internal details to client

### Components
- Use shadcn/ui components when available
- Follow Tailwind CSS conventions
- Server Components by default, 'use client' only when needed
- Extract reusable components to `/components`

### Database
- Always use Prisma client from `/lib/db.ts`
- Include proper indexes on frequently queried fields
- Use transactions for multi-step operations

### TypeScript
- Strong typing everywhere, avoid `any`
- Define interfaces for API responses
- Use Zod for runtime validation

## Important Notes

1. **Auth**: Single password auth - no user management needed
2. **Environment**: Always check for required env vars before using
3. **Amadeus**: Use `AMADEUS_ENV=prod` for real flight data
4. **Rate Limits**: Be mindful of API rate limits, session caching helps

## Common Commands

```bash
# Development
npm run dev

# Database
npx prisma generate
npx prisma migrate dev
npx prisma studio

# Build
npm run build
```

## Environment Variables

Required:
- `AUTH_PASSWORD` - App login password
- `SESSION_SECRET` - iron-session secret (32+ chars)
- `DATABASE_URL` - PostgreSQL connection string
- `AMADEUS_CLIENT_ID` - Amadeus API client ID
- `AMADEUS_CLIENT_SECRET` - Amadeus API secret
- `OPENAI_API_KEY` - OpenAI API key

Optional:
- `AMADEUS_ENV` - Set to "prod" or "production" for production API
- `OPENAI_MODEL` - Override model (defaults to `gpt-4o-mini`)
- `RESEND_API_KEY` - Resend API key for email notifications
- `RESEND_FROM_EMAIL` - Sender email (defaults to `notifications@resend.dev`)
- `NOTIFICATION_EMAIL` - Email to receive price alerts
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Telegram chat ID to receive alerts

## Key Features

### Flight Search
- Natural language queries ("flights to Paris in March under $500")
- Manual structured search with airport autocomplete
- Flexible dates (±3 days)
- Multi-city route optimization with stopover hubs

### Results & Filtering
- Advanced filters: price, duration, stops, departure time, airlines
- Sort by price, duration, or stops
- Session caching (30-min expiry)
- Export to calendar, clipboard, or share

### Price Tracking
- Scheduled tasks with cron expressions
- Price history charts
- Quick price alerts on individual flights
- Email and Telegram notifications

### UX
- Search progress indicator with animated stages
- Saved searches (localStorage, max 10)
- Compare up to 3 searches side-by-side
- Google Flights booking integration

## Key Technical Implementations

**openai.ts:**
- `buildSystemPrompt()` - Comprehensive prompt with 20+ airport codes, Spanish support
- `parseTravelQuery()` - Natural language to structured query
- `lookupAirportCodes()` - AI-based city to IATA code lookup
- `resolveParsedDates()` - Smart date resolution with year adjustment

**amadeus.ts:**
- `searchFlights()` - Flight offers search
- `validateSearchParams()` - Input validation
- `parseAmadeusError()` - Error message extraction

**scheduler.ts:**
- `executeTask()` - Run scheduled search and track prices
- `checkPriceAlerts()` - Check and trigger price alerts
- `runDueTasks()` - Execute all due tasks

**flight-export.ts:**
- `generateICS()` - Create calendar file content
- `copyToClipboard()` - Formatted flight details
- `shareNative()` - Web Share API integration
