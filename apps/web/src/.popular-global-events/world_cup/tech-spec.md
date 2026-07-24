# Technical Specification — OPINION World Cup Platform

## Component Inventory

### shadcn/ui Components
- **Button** — Sign In nav button, tab buttons (with custom pill styling)
- **Card** — Match prediction cards, award category cards, player cards
- **Tabs** — Tournament stage tabs, Awards/Futures tabs
- **Badge** — Group labels, status indicators
- **Input** — Search bar in navbar

### Custom Components

| Component | Purpose | Props |
|---|---|---|
| Navbar | Fixed top navigation | — |
| Hero | Split-gradient hero with SVG curve | — |
| CountdownTimer | Live countdown to event | targetDate: Date |
| MatchCard | Individual match prediction card | group, date, team1, team2, percent1, percent2 |
| ProbabilityBar | Animated progress bar | percent: number, delay?: number |
| StageTabs | Tournament stage filter tabs | activeStage, onStageChange |
| GroupExplorer | 12-group grid with center trophy | — |
| GroupCard | Individual group with 4 teams | letter, teams[] |
| AwardCategory | Award section with player cards | title, graphic, players[] |
| PlayerCard | Individual player prediction | name, percent, image |
| ChampionsSection | World Cup history columns | — |
| WeAre26 | Large typographic statement | — |
| Footer | Site footer with links | — |

### Hooks

| Hook | Purpose |
|---|---|
| useCountdown | Manages countdown timer state, returns days/hours/mins/secs |

## Animation Implementation

| Animation | Library | Implementation Approach | Complexity |
|---|---|---|---|
| Countdown number flip | CSS keyframes | Add `.updating` class on change, trigger `@keyframes numberFlip` (translateY + opacity) | Low |
| Probability bar fill | CSS transition | `width` animates from 0% to target over 1s ease-out on mount via IntersectionObserver | Low |
| Award card entrance | GSAP + ScrollTrigger | Stagger fade-in + translateY(30px→0) for each award category on scroll into view | Medium |
| Group card stagger | GSAP + ScrollTrigger | Stagger fade-in for group cards as they enter viewport | Medium |
| Hero trophy float | CSS animation | Subtle translateY oscillation (±8px) over 4s infinite ease-in-out | Low |
| WE ARE 26 reveal | GSAP + ScrollTrigger | Letters fade in with slight translateY on scroll into view | Medium |
| Smooth scroll | Native CSS | `scroll-behavior: smooth` on html element | Low |

## State & Logic Plan

### Countdown Timer
- Hook `useCountdown` calculates time remaining to target date (June 11, 2026)
- Updates every second via `setInterval`
- Returns `{ days, hours, minutes, seconds }` as zero-padded strings
- Cleans up interval on unmount

### Tournament Stage Tabs
- Local state `activeStage` with values: "group-stage" | "round-of-32" | "quarter-final" | "winner"
- Changes content filter (future rounds show different match data)
- Active tab styled with green pill background

### Awards Tabs
- Local state `activeAwardTab`: "awards" | "futures"
- Toggle between showing award categories vs futures content

### Group Data
- Static data array for all 12 groups with team codes and flag URLs
- No dynamic state needed

### Responsive Breakpoints
- 960px: 4-col → 2-col match cards
- 768px: Group grid single column, hide center trophy
- 640px: Hero scale down, match cards single column
- 480px: Player cards horizontal scroll

## Project Structure

```
src/
├── sections/
│   ├── Navbar.tsx
│   ├── Hero.tsx
│   ├── MatchPredictions.tsx
│   ├── StageTabs.tsx
│   ├── GroupExplorer.tsx
│   ├── AwardsSpecials.tsx
│   ├── Champions.tsx
│   ├── WeAre26.tsx
│   └── Footer.tsx
├── components/
│   ├── CountdownTimer.tsx
│   ├── MatchCard.tsx
│   ├── ProbabilityBar.tsx
│   ├── GroupCard.tsx
│   ├── AwardCategory.tsx
│   └── PlayerCard.tsx
├── hooks/
│   └── useCountdown.ts
├── data/
│   ├── matches.ts
│   ├── groups.ts
│   ├── awards.ts
│   └── champions.ts
├── App.tsx
└── main.tsx
```

## Dependencies

```json
{
  "gsap": "^3.12.7",
  "lucide-react": "^0.400.0"
}
```

## Fonts (Google Fonts CDN)

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:ital,wght@0,800;0,900;1,900&display=swap" rel="stylesheet">
```

## Key Technical Decisions

1. **Hero curve**: Use SVG `clip-path` with `path()` for the organic boundary. More controllable than radial gradient mask and scales better with `viewBox`.

2. **Flag rendering**: Use `flagcdn.com` for reliable flag images (e.g., `https://flagcdn.com/w40/mx.png`). Fallback to emoji flags.

3. **Countdown performance**: Use a single `setInterval` in the hook rather than per-component timers. Store target date as a ref to avoid re-renders.

4. **GSAP ScrollTrigger**: Import from `gsap/ScrollTrigger` and register plugin once in `App.tsx`. Use `@gsap/react` for cleanup.

5. **No intersection observer for simple animations**: Use CSS transitions triggered by a `mounted` state for probability bars. Only use GSAP ScrollTrigger for complex entrance animations (award cards, group cards).
