# Changelog — 2026-04-10

## Business

- **Redesigned Home Experience** — After login, users now land on a modern home page within the full app layout (sidebar, AI copilot, theme toggle). Module cards feature unique accent colors, flip animations with descriptions, and a personalized greeting.

- **"Your Daily" Dashboard** — The daily brief (portfolio alerts, news, meetings, action items) is now accessible as "Your Daily" in the sidebar, giving advisors quick access to their morning briefing.

- **Full-Screen AI Chat** — A dedicated chat page lets users interact with the Invictus AI Copilot in a focused, full-screen interface with conversation history saved automatically in a sidebar.

- **Streamlined Navigation** — The sidebar now shows Home, Your Daily, Chat, Agents, and Settings. The "Runs" page has been removed from navigation (still accessible via direct URL).

---

## Developer

### UI Changes

**New Pages:**

| Page | Route | Description |
|------|-------|-------------|
| `ModulesHomePage` | `/home` | Module cards grid with flip animations, stat cards, per-module accent colors, greeting header |
| `ChatPage` | `/home/chat` | Full-screen chat with history sidebar, reuses `ChatMessage`, `ChatInput`, `useChatStore` |

**Modified Pages:**

| Page | Route | Changes |
|------|-------|---------|
| `DashboardPage` | `/home/dashboard` | Rewritten — now contains daily brief content (was agents overview). Renamed to "Your Daily". Added error handling for API loading. |
| `Sidebar` | — | Removed Runs nav item, renamed Dashboard → "Your Daily", added Chat with Invictus logo icon |
| `TopNav` | — | Breadcrumbs updated for `/home` paths, logo navigates to `/home`, added Chat breadcrumb |
| `ModuleSwitcher` | — | Home and Invictus AI modules now navigate to `/home` and `/home/dashboard` respectively |

**Deleted Pages:**

| Page | Reason |
|------|--------|
| `HomePage` | Content moved to `ModulesHomePage` inside AppShell |
| `InsightsHomePage` | Content moved to `DashboardPage` |

**Layout Changes:**
- All page-level `max-w-*` constraints removed for full-width layouts
- Module cards use per-module accent colors (emerald, blue, violet, amber, orange, slate)

### API / Integration Changes

No changes.

### Internal / Non-Breaking Changes

**Routing Restructure**

Base path changed from `/insights` to `/home`. All internal navigation links, breadcrumbs, and route definitions updated across 10+ files. The `/` route now redirects to `/home` for authenticated users.

**Chat Store Auto-Save**

`useChatStore.sendMessage()` now automatically saves the current conversation thread to history after each completed AI response. Previously, threads were only saved when explicitly starting a new chat.

**DashboardPage Loading Fix**

Added `.catch()` error handling and a `cancelled` flag to the daily brief API call to prevent infinite loading states when the MSW service worker hasn't initialized on navigation.
