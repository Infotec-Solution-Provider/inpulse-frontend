# Copilot Instructions for `inpulse-frontend`

## Big picture (read this first)
- This is the **InPulse CRM frontend** — the interface where CRM users (agents and admins) actually use the platform. It is a multi-tenant WhatsApp customer service tool built with Next.js App Router.
- The app is scoped to a **tenant instance** via the `[instance]` URL segment. All authenticated routes live under `/(private)/[instance]/`.
- Core features: WhatsApp chat interface, internal (agent-to-agent) chat, real-time monitoring, reports/dashboard, and CRUD management for contacts, customers, users, wallets, ready messages, auto-response, and internal groups.
- Real-time updates flow through a `SocketClient` (from `@in.pulse-crm/sdk`) initialized in `socket-context.tsx`. Socket event handlers are isolated in `src/lib/event-handlers/`.
- State is managed through a tree of React Contexts with local reducers. The top-level layout at `src/app/(private)/[instance]/layout.tsx` nests all major providers in order.

## Tech stack
- **Next.js ^16** with App Router, React 19, TypeScript (strict)
- **Tailwind CSS** for utility styling with `dark:` class-based dark mode
- **MUI v7** (`@mui/material`, `@mui/icons-material`, `@mui/x-data-grid`, `@mui/x-date-pickers`) for complex UI components and data tables — MUI ThemeProvider is driven by `src/app/theme-context.tsx` with light/dark configs in `src/lib/themes/`
- **React Hook Form + Zod** for form handling and validation
- **axios** for HTTP calls (token injected globally via `axios.defaults.headers["authorization"]`)
- **react-toastify** for user notifications
- **dayjs** for date manipulation
- **recharts** for charts in the dashboard
- **react-virtuoso** for virtualized chat/list rendering
- **`@in.pulse-crm/sdk`** — internal SDK providing typed API clients and domain types; **`@in.pulse-crm/utils`** — shared utilities (`sanitizeErrorMessage`, `Logger`, `Formatter`)
- Font: Fira Sans (Google Fonts via `next/font`)

## Folder structure
```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout: font, AuthProvider, ToastContainer
│   ├── globals.css
│   ├── auth-context.tsx          # Global auth state: token, user, signIn, signOut
│   ├── theme-context.tsx         # MUI ThemeProvider (light/dark)
│   ├── (private)/
│   │   └── [instance]/
│   │       ├── layout.tsx        # Authenticated shell: nests all feature providers + Header
│   │       ├── app-context.tsx   # Global modal helper (openModal/closeModal)
│   │       ├── socket-context.tsx  # SocketClient initialization and QR/auth events
│   │       ├── whatsapp-context.tsx # Core WPP state: chats, messages, currentChat, send/receive
│   │       ├── internal-context.tsx # Internal chat state (agent ↔ agent)
│   │       ├── header.tsx        # Top nav bar with route links scoped by role
│   │       ├── (main)/           # Main chat page (default route)
│   │       │   ├── page.tsx      # Renders ChatsMenu + Chat side-by-side
│   │       │   ├── (chat)/       # Chat UI: context, reducer, messages list, send area
│   │       │   └── (chats-menu)/ # Sidebar: chat list, filters, start/schedule modals
│   │       ├── monitor/          # Supervisor view of all active/finished chats
│   │       ├── reports/
│   │       │   ├── dashboard/    # Analytics dashboard with recharts
│   │       │   ├── chats/        # Chat-level reports
│   │       │   └── report-generator/ # Exportable report builder
│   │       └── (cruds)/
│   │           ├── contacts/     # Contacts CRUD + contacts-context
│   │           ├── customers/    # Customers CRUD + customers-context
│   │           ├── users/        # Users management (admin only)
│   │           ├── wallets/      # Wallets CRUD
│   │           ├── ready-messages/ # Message templates
│   │           ├── auto-response/  # Auto-response rules
│   │           └── internal-groups/ # Internal group management
│   └── (public)/
│       └── [instance]/
│           └── login/            # Login page (unauthenticated)
├── lib/
│   ├── services/                 # API service singletons (one file per backend)
│   ├── components/               # Shared UI components (reusable across features)
│   ├── event-handlers/           # Socket event handler classes (one per event type)
│   ├── reducers/                 # Shared reducers (e.g., chats-filter.reducer.ts)
│   ├── types/                    # Shared TypeScript interfaces/types
│   ├── themes/                   # MUI theme objects: dark.ts, light.ts
│   ├── utils/                    # Pure utility functions
│   ├── process-chats-and-messages.ts    # WPP chat/message hydration logic
│   └── process-internal-chats-and-messages.ts
├── assets/                       # Static images (logos, etc.)
└── types/                        # Global TypeScript declarations
```

## Key conventions

### Multi-tenancy
- The `[instance]` URL segment is the tenant identifier. It is read from `pathname.split("/")[1]` and used as the key for `localStorage` token storage: `@inpulse/{instance}/token`.
- Feature availability can be toggled per instance via `params` object from the WhatsApp context (e.g., `params["disable_contacts_crud"]`).

### Context + Provider + hook pattern
Every significant feature uses this pattern:
```tsx
// feature-context.tsx
export const FeatureContext = createContext({} as IFeatureContext);

export function useFeatureContext() {
  const context = useContext(FeatureContext);
  if (!context) throw new Error("...");
  return context;
}

export default function FeatureProvider({ children }: { children: ReactNode }) {
  // state, handlers
  return <FeatureContext.Provider value={...}>{children}</FeatureContext.Provider>;
}
```
Providers are composed in `layout.tsx`. Avoid prop-drilling; consume contexts with their dedicated hooks.

### Reducer pattern
Complex local state uses `useReducer` with typed action unions:
```ts
// feature-reducer.ts
export type ChangeFeatureAction = { type: "action-name"; payload: ... } | ...;
export type FeatureState = { ... };
export default function featureReducer(state: FeatureState, action: ChangeFeatureAction): FeatureState { ... }
```

### Service singletons
Each backend service is a singleton in `src/lib/services/`:
```ts
import { UsersClient } from "@in.pulse-crm/sdk";
const usersService = new UsersClient(process.env.NEXT_PUBLIC_USERS_URL || "http://localhost:8001");
export default usersService;
```
Never instantiate SDK clients in components — always import the singleton.

### Client vs Server components
- Interactive components (anything with hooks, context, event handlers) must have `"use client"` at the top.
- Page shells that only compose providers or do async data fetching can be Server Components.
- Contexts and providers are always `"use client"`.

### File naming
- Files: `kebab-case.tsx` / `kebab-case.ts`
- React components: PascalCase export
- Context files: `feature-context.tsx`
- Reducer files: `feature-reducer.ts`
- Service files: `feature.service.ts`

### Role-based access
- `UserRole` enum from `@in.pulse-crm/sdk` is used to conditionally render nav items and admin-only features.
- Check `user.role === UserRole.Admin` (or similar) before rendering admin UI.

## Dev/build commands
| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build (with lint) |
| `npm run f` | Production build skipping lint (`next build --no-lint`) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run u` | Update `@in.pulse-crm/sdk` to latest |

## Service connections (env vars)
All env vars are `NEXT_PUBLIC_*` (available in the browser):

| Variable | Default | Service |
|---|---|---|
| `NEXT_PUBLIC_USERS_URL` | `http://localhost:8001` | users-service (auth + users) |
| `NEXT_PUBLIC_CUSTOMERS_URL` | `http://localhost:8002` | customers-service |
| `NEXT_PUBLIC_REPORTS_URL` | `http://localhost:8006` | logs-service (reports) |
| `NEXT_PUBLIC_FILES_URL` | `http://localhost:6003` | files-service |
| `NEXT_PUBLIC_WHATS_URL` | `http://localhost:5000` | whatsapp-service |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:8004` | socket-service |

All HTTP communication goes through `@in.pulse-crm/sdk` typed clients. Raw `axios` is used only for cases not covered by the SDK; the Bearer token is set globally on `axios.defaults.headers`.

## Critical patterns

### Authentication flow
1. `AuthProvider` (root) reads `localStorage[@inpulse/{instance}/token]` on mount.
2. On valid token: sets `axios.defaults.headers["authorization"]`, fetches user, redirects away from login.
3. `signIn()` stores token, updates auth, redirects to `/{instance}`.
4. All downstream contexts receive `token` + `user` from `AuthContext`.

### Socket event handling
- `SocketProvider` connects/disconnects on `token` change.
- Feature contexts (e.g., `WhatsappContext`) subscribe to socket events via `socket.on(SocketEventType.X, handler)` inside `useEffect`.
- Event handler logic is extracted to `src/lib/event-handlers/` — one class/function per event type — to keep contexts lean.
- Always clean up with `socket.off(...)` in the `useEffect` return.

### Chat state flow
The chat subsystem has two layers:
1. **`whatsapp-context.tsx`** — manages the full list of chats, current chat, and all WPP API calls (`sendMessage`, `finishChat`, `transferChat`, etc.).
2. **`chat-context.tsx`** (local to `(chat)/`) — manages the in-progress message compose state via `chat-reducer.ts` (text, file attachment, emoji menu, forward mode).

### Dark mode
- Tailwind: use `dark:` prefix classes alongside light variants.
- MUI: `ThemeProvider` in `theme-context.tsx` switches between `src/lib/themes/light.ts` and `src/lib/themes/dark.ts`.
- Dark mode preference is toggled via `ThemeToggleButton` component.

### Forms
Use React Hook Form + Zod throughout:
```tsx
const schema = z.object({ field: z.string().min(1) });
const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
```

## Feature modules at a glance
| Module | Location | Description |
|---|---|---|
| WhatsApp Chat | `(main)/(chat)/` | Real-time message view, send area, file/audio/emoji, forward, quote, edit |
| Chat Sidebar | `(main)/(chats-menu)/` | Chat list with filters, start-chat modal, schedule modal |
| Monitor | `monitor/` | Supervisor view: all chats/queues visible and actionable by admins |
| Dashboard | `reports/dashboard/` | Analytics charts via recharts, filterable by date/user |
| Chat Reports | `reports/chats/` | Detailed per-chat report view |
| Contacts | `(cruds)/contacts/` | CRUD for WPP contacts, linkable to customers |
| Customers | `(cruds)/customers/` | CRM customer records |
| Users | `(cruds)/users/` | User management (admin only) |
| Wallets | `(cruds)/wallets/` | Wallet/sector management |
| Ready Messages | `(cruds)/ready-messages/` | Reusable message templates |
| Auto Response | `(cruds)/auto-response/` | Automated reply rules |
| Internal Groups | `(cruds)/internal-groups/` | Agent group chat management |
