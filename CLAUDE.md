# TELAOne Alpha — Claude Code Governance

## Read First, Build Second

Before touching any UI file, read:
- `DESIGN_SYSTEM.md` — design constitution
- `design-system/tokens.css` — canonical values (never invent colors, fonts, or spacing)
- `design-system/TELACard.tsx` — reference component showing correct output

## Stack
Next.js 15 App Router · TypeScript · Tailwind CSS v4 · Framer Motion

## Design Rules — Hard Constraints

### Color
- NEVER use Tailwind defaults (gray-*, slate-*, blue-*) for UI surfaces
- ALWAYS use CSS custom properties from `tokens.css`
- Base surface: `var(--color-void)` — `#0A0E17`
- Card surface: `var(--color-navy)` — `#0D1B2A`
- Primary accent: `var(--color-gold)` — `#C4973A`
- Body text: `var(--color-cream)` — `#EAE0D2`
- Muted text: `var(--color-cream-muted)` — `#9A8F80`
- Status green: `var(--color-status-green)` — `#4CAF6E`
- Status amber: `var(--color-status-amber)` — `#E09840`
- Status red: `var(--color-status-red)` — `#C0392B`

### Typography
- NEVER use Inter, Roboto, Arial, or system-ui for display or body text
- Display / hero text: `font-family: var(--font-display)` — Playfair Display, serif
- Body / UI text: `font-family: var(--font-body)` — DM Sans, sans-serif
- Metadata / timestamps / labels: `font-family: var(--font-mono)` — DM Mono, monospace
- Category labels: ALL CAPS, letter-spacing 0.12em, 11–12px, muted color

### Spacing
- Minimum tap target: 44px × 44px — no exceptions
- Card padding: `var(--space-card)` — 20px
- Screen edge margin: `var(--space-screen-edge)` — 16px
- Section gap: `var(--space-section)` — 24px
- Editorial whitespace is a feature, not waste

### Cards / Surfaces
- Border radius: `var(--radius-card)` — 16px
- Background: `var(--color-navy)` with subtle border `rgba(196,151,58,0.12)`
- No box-shadow theatrics — use layered backgrounds and border for depth
- Hero cards: full-bleed image with dark gradient overlay, text floated above

### Bottom Navigation
- 5 tabs: Home · Play · Messages · Calendar · Profile
- Active tab: `var(--color-gold)`, icon + label
- Inactive: `var(--color-cream-muted)`
- Height: 83px, safe-area-aware padding

### Status Indicators
- Dot indicators: 8px circle, semantic color (green/amber/red)
- Pills: 6px border-radius, 10px vertical padding, ALL CAPS label, 11px
- LIVE badge: deep red `#8B1A1A`, white text
- ATTENTION badge: amber background

### Motion
- Page load: staggered fade+translate-up, 40ms delay increments
- Card entry: `opacity: 0 → 1`, `transform: translateY(12px) → 0`, 280ms ease-out
- Tab switch: 150ms crossfade
- NO bounce, NO spring theatrics, NO persistent looping animations
- Framer Motion preferred; CSS fallback acceptable

### Hero / Full-Bleed Images
- Always overlay with `linear-gradient(to bottom, rgba(10,14,23,0.2) 0%, rgba(10,14,23,0.85) 100%)`
- Text rendered over gradient, never over raw image
- Min height: 220px on mobile

## Prohibited Patterns
- No purple gradients of any kind
- No generic SaaS card layouts (white bg, border, shadow-md)
- No rounded corners > 20px except pills and avatars
- No Inter or system fonts
- No Tailwind color utilities for brand surfaces (use CSS vars)
- No dashboard grid with 4 equal stat boxes
- No skeleton loaders with gray shimmer — use subtle opacity pulse in navy
- No modals unless explicitly requested

## Mobile-First Rules
- Design for 390px width first
- All interactive elements thumb-reachable
- Bottom nav is always fixed, safe-area-padded
- Scroll is vertical only — no horizontal scroll on main content
- Font sizes: hero 32–40px, section header 20px, body 15px, label 12px

## File Naming
- Components: PascalCase (`TELACard.tsx`, `ShowStatus.tsx`)
- Pages: lowercase kebab (`app/messages/page.tsx`)
- CSS: kebab (`tokens.css`, `globals.css`)

## Codex Priority Order
continuity > stability > mobile fluency > design fidelity > polish > novelty
