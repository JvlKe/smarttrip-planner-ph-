# SmartTrip Planner PH

SmartTrip Planner PH is a Philippine travel-planning website currently in its frontend design stage. Its interface follows the proposal-stage wireframes and design system.

## Current progress

The current milestone includes:

- Responsive public landing page
- Sign-in page design
- Registration page design
- Light and dark modes
- Desktop and mobile navigation
- SmartTrip branding, rounded cards, and local travel photography
- Destination cards for Palawan, Boracay, Batanes, and Siargao
- Existing Supabase form handlers preserved for later integration testing

The landing, sign-in, and registration pages were checked at approximately 320 px, 768 px, 1024 px, and 1440 px. No horizontal overflow, broken images, or browser console errors were found during the latest local check.

## Preview routes

| Route | Current page |
| --- | --- |
| `/` | Landing page |
| `/login` | Sign-in design |
| `/register` | Registration design |

## Run the current frontend

Requirements:

- Node.js 20.19 or newer
- npm

```bash
git clone https://github.com/JvlKe/smarttrip-planner-ph-.git
cd smarttrip-planner-ph-
npm ci
```

Copy `client/.env.example` to `client/.env`. For design-only local viewing, use non-secret placeholder values. Real authentication requires valid Supabase project values.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_API_URL=http://localhost:4000/api
```

Start the frontend:

```bash
npm run dev -w client
```

Open [http://localhost:5173](http://localhost:5173).

## Current verification

- Client production build passes.
- Prisma schema validation passes when the required database environment variables are provided.
- All 14 existing server tests pass.
- Public pages pass the current responsive and dark-mode checks.

## Not completed yet

The following items must not be treated as complete:

- Live Supabase registration and sign-in testing
- Password-recovery page design and implementation
- Protected dashboard and navigation design
- Live database persistence testing
- Trip-planning feature integration
- New client and API deployment
- Final screenshots and documentation

Older protected pages and backend code remain in the repository as implementation reference while the new interface is built and verified.

## Current files

- `client/src/pages/LandingPage.jsx` — public landing page
- `client/src/pages/AuthPage.jsx` — sign-in and registration pages
- `client/src/components/BrandLogo.jsx` — reusable SmartTrip logo
- `client/src/fresh.css` — current public-page design and responsive styles
- `REPORT.md` — current weekly progress report
- `docs/THREE-PART-IMPLEMENTATION-PLAN.md` — project work plan

## Photo credits

- Boracay: Choi2451, [White beach on Boracay island](https://commons.wikimedia.org/wiki/File:White_beach_on_boracay_island.jpg)
- Batanes: Johnkevinreglos, [Vayang Rolling Hills, Batanes, Philippines](https://commons.wikimedia.org/wiki/File:Vayang_Rolling_Hills,_Batanes,_Philippines.jpg)
- Siargao: CharMel Creations, [Siargao Island](https://commons.wikimedia.org/wiki/File:Siargao_Island.jpg)

## Current project status

This is a frontend design checkpoint, not a finished production release. Continue using `REPORT.md` for verified progress and unresolved issues.
