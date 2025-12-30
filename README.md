## Bucks Bible

Bucks Bible is a Next.js 15 trading risk management tool with AI-powered trade amount suggestions using Genkit and Google AI (Gemini 2.0 Flash).

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server on port 9002 with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run genkit:dev` | Start Genkit development server |
| `npm run genkit:watch` | Start Genkit with file watching |

## Architecture Overview

### Tech Stack
- **Next.js 15.3.8** with App Router + React 18
- **TypeScript 5** (strict mode enabled)
- **Tailwind CSS** + **Shadcn/UI** components (Radix UI primitives)
- **Genkit** + **Google AI** (Gemini 2.0 Flash) for AI features
- **React Hook Form** + **Zod** for form validation
- **Recharts** for data visualization
- **XLSX** for Excel import/export

### Directory Structure

```
src/
├── app/           # Next.js App Router
│   ├── layout.tsx # Root layout with dark theme
│   ├── page.tsx   # Home page
│   └── globals.css # Global styles with CSS variables
├── components/    # React components
│   ├── ui/        # Shadcn/UI components (40+ headless components)
│   └── trade-wise-dashboard.tsx # Main dashboard
├── ai/            # Genkit AI configuration and flows
│   ├── genkit.ts  # Genkit initialization
│   ├── dev.ts     # Dev UI configuration
│   └── flows/     # Individual AI flow definitions
├── hooks/         # Custom React hooks (use-toast, use-mobile)
└── lib/           # Utility functions
```

### Key Architectural Patterns

- **Path alias:** `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- **UI Components:** All components in `components/ui/` are Shadcn/UI - these are pre-built, customizable components. Use them for consistency rather than building from scratch.
- **AI Flows:** Genkit flows are defined in `src/ai/flows/` and configured in `src/ai/genkit.ts`
- **State Management:** React state + LocalStorage for persistence
- **Forms:** React Hook Form with Zod validation schemas
- **Styling:** Dark theme by default using CSS variables defined in `app/globals.css`

### Style Guidelines (from [docs/blueprint.md](docs/blueprint.md))

- **Primary:** Dark blue (#2E3148)
- **Background:** Very dark blue (#1E202D)
- **Accent:** Electric green (#00FF7F) for key metrics and CTAs
- **Font:** Inter (sans-serif)
- **Icons:** Lucide React (minimalist, geometric)

### Core Features

- Trade input form (stock, amount, return percentage, outcome)
- Trade logging with history
- Session statistics (portfolio value, win rate, potential payout)
- Session reset functionality
- AI-powered trade amount suggestions with bankruptcy risk alerts
- File import/export for trade data (Excel, CSV)

## MVP Features Requiring Verification

The following features are in MVP state and need testing/verification before being considered complete:

