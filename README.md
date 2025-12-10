# PersonalTravel

A personal flight search application with AI-powered natural language queries, multi-city route optimization, and automated price tracking. Built for the savvy traveler who wants to find the best deals without the noise of commercial flight search engines.

## Features

### AI-Powered Search
Type naturally like you would talk to a travel agent:
- *"Flights from NYC to Tokyo in late March for 2 weeks under $1200"*
- *"Vuelos a Madrid desde Buenos Aires en febrero"* (Spanish supported)
- *"Weekend trip to Miami from Chicago around Valentine's Day"*

The app understands dates, budgets, trip durations, and cities in multiple languages.

### Smart Route Optimization
Find cheaper alternatives by splitting your journey through strategic stopover hubs. The app automatically compares:
- Direct flights
- One-stop connections
- Multi-city combinations (separate bookings)

### Price Tracking & Alerts
- **Scheduled Tasks**: Set up recurring searches with cron expressions
- **Quick Alerts**: One-click price alerts on any flight
- **Price History**: Visual charts showing price trends over time
- **Notifications**: Get alerts via email (Resend) or Telegram

### Advanced Filtering
Filter results by:
- Price range
- Maximum duration
- Number of stops
- Departure time (morning, afternoon, evening, night)
- Specific airlines

### Export & Share
- Download flight details as `.ics` calendar events
- Copy formatted flight info to clipboard
- Share via native share API on mobile

## Screenshots

*Coming soon*

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Database | PostgreSQL + Prisma 7 |
| Authentication | iron-session (password-based) |
| UI | shadcn/ui + Tailwind CSS v4 |
| Flight Data | Amadeus API |
| AI/NLP | OpenAI gpt-5-nano |
| Email | Resend |
| Notifications | Telegram Bot |
| Animations | Framer Motion |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- API keys (see below)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/personal-travel.git
   cd personal-travel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) and log in with your password.

## Environment Variables

Create a `.env.local` file with the following variables:

### Required

```env
# Authentication
AUTH_PASSWORD=your_secure_password
SESSION_SECRET=your_32_character_or_longer_secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/personaltravel

# Amadeus Flight API
AMADEUS_CLIENT_ID=your_amadeus_client_id
AMADEUS_CLIENT_SECRET=your_amadeus_client_secret
AMADEUS_ENV=prod  # Use "prod" for real flight data

# OpenAI (for natural language processing)
OPENAI_API_KEY=your_openai_api_key
```

### Optional

```env
# OpenAI model override (defaults to gpt-5-nano)
OPENAI_MODEL=gpt-5-nano

# Email notifications via Resend
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=notifications@yourdomain.com
NOTIFICATION_EMAIL=your_email@example.com

# Telegram notifications
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

## Getting API Keys

### Amadeus API (Flight Data)

1. Go to [Amadeus for Developers](https://developers.amadeus.com/)
2. Create a free account
3. Create a new application in the dashboard
4. Copy the **API Key** and **API Secret**
5. For production data, you'll need to request production access (free tier has test data only)

> **Note**: The test environment returns limited/fake data. Request production access for real flight prices.

### OpenAI API (Natural Language Processing)

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account and add billing
3. Navigate to **API Keys** in settings
4. Create a new secret key
5. Copy the key (starts with `sk-`)

> **Cost**: The app uses `gpt-5-nano` which is affordable ($0.25 per 1M input tokens, $2 per 1M output tokens).

### Resend (Email Notifications) - Optional

1. Go to [Resend](https://resend.com/)
2. Create a free account (100 emails/day free)
3. Add and verify your domain (or use the sandbox)
4. Create an API key in the dashboard

### Telegram Bot (Notifications) - Optional

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the bot token
4. To get your chat ID:
   - Send a message to your new bot
   - Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Find your `chat.id` in the response

## Usage

### Natural Language Search

On the home page, type your search in natural language:

```
Flights from San Francisco to London next month for a week
```

The AI will parse your query and search for matching flights.

### Manual Search

Click "Manual Search" to use the structured form with:
- Airport autocomplete
- Date pickers
- Passenger count
- Cabin class selection
- Flexible dates toggle (±3 days)

### Setting Up Price Tracking

1. **Quick Alert**: Click the bell icon on any flight card to set a target price
2. **Scheduled Task**: Go to Tasks > New Task to set up recurring searches with custom schedules

### Comparing Searches

1. Save searches you want to compare
2. Select up to 3 saved searches using the compare checkbox
3. Click "Compare" to see side-by-side results with highlighted best options

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected routes
│   │   ├── page.tsx     # Home - search interface
│   │   ├── tasks/       # Price tracking tasks
│   │   ├── history/     # Search history
│   │   ├── settings/    # Notification preferences
│   │   └── chat/        # Chat interface
│   ├── api/             # API routes
│   └── login/           # Login page
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── flights/         # Flight search components
│   └── tasks/           # Task management components
└── lib/                 # Services and utilities
    ├── amadeus.ts       # Flight search API
    ├── openai.ts        # NLP parsing
    ├── scheduler.ts     # Task execution
    └── notifications.ts # Alert delivery
```

## Scheduled Tasks

To run scheduled price checks, you have two options:

### Option 1: External Cron (Recommended for Production)

Set up a cron job or use a service like [cron-job.org](https://cron-job.org) to hit:

```
GET /api/cron/run-tasks?secret=YOUR_CRON_SECRET
```

Add `CRON_SECRET` to your environment variables for security.

### Option 2: Vercel Cron (If Deploying to Vercel)

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/run-tasks",
    "schedule": "0 */6 * * *"
  }]
}
```

## Development

```bash
# Start dev server
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# View database
npx prisma studio
```

## Deployment

The app is designed to deploy easily on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables
4. Deploy

For other platforms, ensure you have:
- Node.js 18+ runtime
- PostgreSQL database connection
- Environment variables configured

## License

MIT

## Acknowledgments

- [Amadeus](https://developers.amadeus.com/) for flight data
- [OpenAI](https://openai.com/) for natural language processing
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Vercel](https://vercel.com/) for Next.js and hosting
