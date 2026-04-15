# Feature: Deals Module — Phase 2 Frontend Completion
Last updated: 2026-04-15

## Goal
Complete the remaining ~15% of the Deals module frontend: add events/tasks page, notification panel, workspace enhancements (notes canvas, copilot, comments, export), and harden existing features with RBAC guards, email fixes, settings CRUD, dashboard filters, and matched-opportunities in mandates.

## Non-Goals
- No backend implementation — all API calls stay mocked via MSW
- No real Google Calendar OAuth flow — UI card only; mock handlers simulate connect/disconnect
- No server-side document rendering — PDF via CSS print, Word via `docx` package (client-side only)
- No LLM calls from the frontend — Copilot panel proxies through `/api/v1/platform/chat/*`
- No new auth system — RBAC uses `useAuthStore().user.role` as-is

## Key Decisions

### Decision 1: Notes Canvas — lightweight SVG, no canvas library
- Decision: Build `NotesCanvas` as SVG-based drag-and-drop sticky notes
- Why: Spec requires a "notes canvas" but not full whiteboard fidelity; avoids a heavy dependency (Fabric.js / Konva / Excalidraw are 100–400 kB)
- Alternatives considered: Fabric.js, Konva.js, Excalidraw embed
- Trade-off accepted: Less feature-rich than a real whiteboard; acceptable for MVP; can swap later

### Decision 2: Document Export — browser-native PDF + `docx` for Word
- Decision: PDF via `window.print()` with `@media print` CSS; Word via the `docx` npm package
- Why: Zero server dependency; both run entirely in browser; `docx` is well-maintained and tree-shakeable
- Alternatives considered: Puppeteer (needs server), html2pdf.js (layout issues), Google Docs API
- Trade-off accepted: PDF layout fidelity is browser-dependent; Word styling is limited to what `docx` supports

### Decision 3: Comments — sidebar panel, not inline TipTap marks
- Decision: `CommentsPanel` is a sidebar component; comments reference section headings (not character ranges)
- Why: Inline TipTap annotation extensions are complex and brittle; sidebar pattern matches Notion/Docs UX and is simpler to test
- Alternatives considered: `@tiptap/extension-collaboration-annotation`, `prosemirror-collab`
- Trade-off accepted: No inline anchor highlighting; comments tied to headings only; revisit if spec tightens

### Decision 4: Notification store — slice in existing `store.ts`
- Decision: Add `notifications` slice to the existing `store.ts` rather than a separate file
- Why: Notifications are module-scoped; a separate store file would fragment state without benefit at this scale
- Alternatives considered: `useNotificationStore` as a standalone Zustand store
- Trade-off accepted: `store.ts` grows slightly; fine given module boundaries

### Decision 5: Role Switcher — dev-only, `import.meta.env.DEV` guard
- Decision: `DevRoleSwitcher` renders only when `import.meta.env.DEV === true`; persists to `localStorage`
- Why: Vite's `import.meta.env.DEV` is tree-shaken in production builds — component ships zero bytes in prod
- Alternatives considered: Query param `?role=analyst`, Storybook story controls
- Trade-off accepted: Requires page refresh after switching; acceptable for dev tooling

### Decision 6: Comments threading depth — 1 level only
- Decision: Implement flat replies (1-level thread) under each comment; no nested replies
- Why: Spec is silent on thread depth; 1-level covers 95% of review workflows and is far simpler to implement
- Alternatives considered: Unlimited nesting (like GitHub PR comments)
- Trade-off accepted: Power users can't nest replies; can extend to N-level later if needed

## Open Risks / Known Debt
- `NotesCanvas` has no persistence model in the spec — mock stores notes in-memory; will reset on page reload
- Google Calendar sync is UI-only; real OAuth + webhook sync requires backend work out of scope
- ~35 new MSW handlers must land in Phase 2 before any Phase 3–12 work can be tested end-to-end
- `docx` package hasn't been added to `client/package.json` yet — needs `pnpm add docx`
- Comments threading depth (1-level) may need revisiting based on user feedback

## Claude Context Rules
- Do NOT refactor existing TipTap extensions in `workspace/` — they are stable and complex
- Do NOT change existing Zustand slice shapes (opportunity, mandate, email, assetManager)
- Safe to add new slices alongside existing ones in `store.ts`
- RBAC: always use `useAuthStore().user.role` — do not introduce a new auth abstraction
- All new components: named export + interface above component + Tailwind via `cn()`
- New MSW handlers go in `client/src/api/mock/handlers.ts`; new mock data in `client/src/api/mock/data/deals.ts`
- Path alias `@` maps to `src/` — use it for all imports
