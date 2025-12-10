# PersonalTravel - Claude Code Instructions

## Project Overview

Personal flight search application with AI-powered natural language queries, multi-city route optimization, and price tracking.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Database**: PostgreSQL + Prisma 7 ORM
- **Auth**: Simple password with iron-session
- **UI**: shadcn/ui + Tailwind CSS v4 (Editorial Travel Magazine theme)
- **Flight APIs**: Amadeus (primary)
- **AI**: OpenAI gpt-4o-mini for NLP parsing
- **Email**: Resend for notifications

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected routes (home, tasks, history)
│   ├── api/
│   │   ├── auth/        # Login/logout endpoints
│   │   ├── airports/    # Airport search endpoint
│   │   └── flights/
│   │       ├── search/         # Manual flight search
│   │       └── search-natural/ # AI-powered natural language search
│   └── login/           # Public login page
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # App layout (navbar)
│   └── flights/         # Flight-specific components
│       ├── flight-card.tsx
│       ├── flight-card-skeleton.tsx
│       ├── flight-results-list.tsx
│       └── flight-search-form.tsx
├── components/
│   ├── tasks/           # Task management components
│   │   ├── task-card.tsx
│   │   ├── task-form.tsx
│   │   ├── task-detail-dialog.tsx
│   │   └── price-chart.tsx
└── lib/
    ├── auth.ts          # Authentication helpers
    ├── db.ts            # Prisma client (lazy-loaded)
    ├── utils.ts         # Utility functions
    ├── amadeus.ts       # Amadeus API service
    ├── openai.ts        # OpenAI NLP service
    ├── scheduler.ts     # Task scheduler service
    ├── notifications.ts # Notification coordination
    └── resend.ts        # Email service
```

## Key Files

- `PLAN.md` - Full implementation plan with phases
- `tasks.md` - Checkbox task tracker for progress
- `prisma/schema.prisma` - Database schema
- `.env.local` - Environment variables (not committed)

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
3. **Amadeus**: Test env has limited data, mock when needed
4. **Rate Limits**: Be mindful of API rate limits, add caching

## When Starting a Session

1. Check `tasks.md` for current progress
2. Review `PLAN.md` for overall context
3. Continue from the last incomplete task
4. Update tasks.md checkboxes as you complete work

## Testing

- Test API endpoints with curl/httpie first
- Verify Prisma queries work before building UI
- Check auth flow works before testing protected routes

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
- `OPENAI_MODEL` - Override model, defaults to `gpt-4o-mini`
- `RESEND_API_KEY` - Resend API key for email notifications
- `RESEND_FROM_EMAIL` - Sender email (defaults to `notifications@resend.dev`)
- `NOTIFICATION_EMAIL` - Email to receive price alerts
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Telegram chat ID to receive alerts
- `AMADEUS_ENV` - Set to "prod" or "production" for production API (api.amadeus.com)

## Current Session Status (Dec 10, 2025)

### Completed Improvements:
1. **OpenAI Model Fix**: Changed DEFAULT_MODEL from "gpt-5.1-mini" (non-existent) to "gpt-4o-mini" at `src/lib/openai.ts:25`
2. **System Prompt Rewrite**: `buildSystemPrompt()` at lines 108-262 with 20+ airport codes, Spanish support, date parsing rules
3. **Zod Nullable Helpers**: Added `nullableString()`, `nullableNumber()`, `nullableArray()` at lines 32-36 to handle LLM null values
4. **Date Resolution Fix**: Added `parseDateString()` helper at lines 522-526 to fix timezone issues with `new Date("YYYY-MM-DD")`
5. **Airport Lookup Enhancement**: Enhanced prompt at lines 314-347 with primary airport rules
6. **Amadeus Error Handling**: Added `validateSearchParams()` and `parseAmadeusError()` at lines 231-429
7. **Amadeus Hostname Fix**: Now accepts both "prod" and "production" for AMADEUS_ENV

### Fixed Issues (Dec 10) - ALL VERIFIED WORKING:

1. **Amadeus SDK Response Parsing (amadeus.ts:214-227):**
   - Old code: `response.data as FlightSearchResponse` then `data?.data` - WRONG (double nesting)
   - New code: `response.data` IS the array of FlightOffer[], `response.result` contains dictionaries
   - Result: 50 flights now returned successfully

2. **Date Resolution Past-Date Bug (openai.ts:510-517):**
   - Old code: If date was "in the past", default to tomorrow (wrong for future months in past year portion)
   - New code: If date is "in the past", add 1 year instead
   - Example: "late February" → AI parses as 2025-02-20 → ensureFuture() converts to 2026-02-20
   - Result: February 2026 flights returned correctly

### Full Pipeline Verified Working:
- NLP Parsing: ✅ gpt-4o-mini with comprehensive prompts
- Airport Lookup: ✅ AI-based with primary airport rules
- Date Resolution: ✅ Correctly handles future dates via year adjustment
- Amadeus Search: ✅ Production API returning real flight offers
- Database Storage: ✅ SearchQuery and FlightResult records created

### Key Functions in openai.ts:
- `buildSystemPrompt(currentDate)` - Lines 108-262
- `parseTravelQuery(query)` - Lines 267-305
- `lookupAirportCodes(cities)` - Lines 310-380
- `resolveParsedDates(parsed)` - Lines 429-600 (includes parseDateString helper at 522-526)

### Key Functions in amadeus.ts:
- `searchFlights(params)` - Lines 182-229
- `validateSearchParams(params)` - Lines 234-323
- `parseAmadeusError(error)` - Lines 328-429
