# FIFA 2026 Crowd Control Portal Integration Plan

We will integrate the custom hero component into the web application, styling the landing page and inside pages (Audience and Organizer portals) to match its bright-blue (`#0038FF`), neon-yellow/green (`#CCFF00`), hand-drawn accent, and grid-background styling. We will also ensure all backend APIs and WebSockets remain fully functional and connected.

## User Review Required

> [!IMPORTANT]
> The new hero component has a high-fidelity Web3/SocialFi style. We will adapt this design system to the Etihad Stadium FIFA 2026 Crowd Management Application. 
> 
> Here is how we will map the new aesthetic:
> 1. **Branding**: The "BASE CLUB" badge will be adapted to **FIFA 2026** and **ETIHAD SYSTEM**.
> 2. **Typography**: Large Arial Black 3D text styling (`#CLUB`, `SOCIALFI`, `PEOPLE`) will read `#FIFA2026`, `CROWD`, `CONTROL`.
> 3. **Interactive Features**: 
>    - **Card 1 (Bottom Left Glass Card)**: Interactive Audience entry point showing spectator ticketing details/wayfinding targets.
>    - **Card 2 (Top Right Glass Card)**: Interactive Organizer entry point showing active alarm counts and command telemetry.
>    - **Bottom Card 1 (Audience Seating & Chatbot)**: Links to the Audience Portal (`/audience`).
>    - **Bottom Card 2 (Organizer Command Center)**: Links to the Organizer Portal (`/organizer`).
>    - **Bottom Card 3 (Live Telemetry & Alerts)**: Shows real-time aggregate statistics from the backend (total active SOS alerts, total crowded gates).
> 4. **Theme matching**: The `/audience` and `/organizer` subpages will be re-styled to inherit the vibrant blue/green grid theme, custom cards, custom svg arrows, and badge elements.

## Open Questions

None. The design adaptation aligns perfectly with the user's codebase.

## Proposed Changes

### Configuration & Package Management

#### [MODIFY] [package.json](file:///d:/Work/FIFA-master/frontend/package.json)
- Add `"motion"` dependency (or verify dependency resolutions).

---

### Component UI Integration

#### [NEW] [hero.tsx](file:///d:/Work/FIFA-master/frontend/src/components/ui/hero.tsx)
- Create `/components/ui/` directory.
- Add the copy-pasted `hero.tsx` component.
- *Rationale for path:* Creating `/components/ui/` separates pure atomic visual primitives from domain-specific app components (`StadiumMap`, etc.), ensuring consistency with standard component libraries (like shadcn).

#### [MODIFY] [page.tsx](file:///d:/Work/FIFA-master/frontend/src/app/page.tsx)
- Replace the root landing page with the newly-styled hero component page.
- Wire the floating cards and action buttons to backend API endpoints (fetching active alert counts and gate statuses to display live metrics in the cards).

---

### Inside Pages Re-Styling

#### [MODIFY] [audience page.tsx](file:///d:/Work/FIFA-master/frontend/src/app/audience/page.tsx)
- Update layout to utilize the `#0038FF` background, custom grid pattern, custom glassmorphism cards, and hand-drawn arrow/badge highlights.

#### [MODIFY] [organizer page.tsx](file:///d:/Work/FIFA-master/frontend/src/app/organizer/page.tsx)
- Update layout to inherit the consistent branding, neon accents, and custom hand-drawn icons.

## Verification Plan

### Automated Tests
- Build and run the Next.js app to ensure no TS compiler errors or dependency resolution issues.
```bash
cd frontend
npm run build
```

### Manual Verification
- Run both backend and frontend.
- Verify page load animations, interactive hover effects, and WebSocket telemetry updates.
- Verify ticket entry wayfinding, SOS sending, and organizer response updates.
