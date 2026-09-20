# SmartTrip Planner PH

## AI credit

Developed with substantial AI assistance for code, design, troubleshooting, tests and documentation. See [AI-USAGE.md](AI-USAGE.md) for the working evidence log, corrections and authorship status. Independently authored backend contributions are not yet verified.

SmartTrip Planner PH is a Philippine travel-planning website currently in its frontend design stage. Its interface follows the proposal-stage wireframes and design system.

Atlas is currently hidden from the interface; integration and testing are planned for Week 2.

## Current progress

The current milestone includes:

- Responsive public landing page
- Sign-in page design
- Registration page design
- Light and dark modes
- Desktop and mobile navigation
- SmartTrip branding, rounded cards, and local travel photography
- Destination cards for Palawan, Boracay, Batanes, and Siargao
- Supabase sign-in and registration wiring, including email-confirmation handling (live testing pending)
- API profile creation after a confirmed sign-in
- Proposal-based dashboard, trip-planning, destinations, analytics, profile and settings design

Maps are deferred from the Week 1 release. Navigation opens a fixed Philippines map; interactive maps and directions are disabled through `client/src/lib/releaseScope.js`; code is retained for Week 2 integration and testing.

The landing, sign-in, and registration pages were checked at approximately 320 px, 768 px, 1024 px, and 1440 px. No horizontal overflow, broken images, or browser console errors were found during the latest local check.

## Preview routes

| Route       | Current page        |
| ----------- | ------------------- |
| `/`         | Landing page        |
| `/login`    | Sign-in design      |
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

For live authentication and profile data, also copy `server/.env.example` to `server/.env` and fill in the same Supabase project URL and publishable key, plus the project's PostgreSQL connection strings. Keep `.env` files local; they are ignored by Git. In the Supabase Auth URL settings, allow `http://localhost:5173/login` as a redirect URL for email confirmation. Then run:

```bash
npm run check:connection
npm run db:deploy
npm run db:seed
npm run dev
```

The connection check verifies Auth and PostgreSQL without printing keys or passwords. Run database deployment and seeding only after the connection check passes.

## Current verification

- Client production build passes.
- Supabase Auth and PostgreSQL connection checks pass with local `.env` files.
- The live database has 20 destination records and all 11 committed migrations applied.
- Prisma schema validation passes.
- All 16 server tests pass.
- Public pages pass the current responsive and dark-mode checks.

## Not completed yet

The following items must not be treated as complete:

- Live Supabase registration, email confirmation, and sign-in testing
- End-to-end password-recovery verification
- Live database persistence testing
- Trip-planning feature integration
- New client and API deployment
- Final screenshots and documentation

Protected pages are included in the design checkpoint. Rendering checks do not establish that every backend workflow is complete.

## Current files

- `client/src/pages/LandingPage.jsx` — public landing page
- `client/src/pages/AuthPage.jsx` — sign-in and registration pages
- `client/src/components/BrandLogo.jsx` — reusable SmartTrip logo
- `client/src/fresh.css` — current public-page design and responsive styles

## Photo credits

- Samal: Wikityrey, [Pearl Farm at Samal Island, Davao](https://commons.wikimedia.org/wiki/File:Pearl_Farm_at_Samal_Island,_Davao.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Baguio: Patrickroque01, [Burnham Park Lake](https://commons.wikimedia.org/wiki/File:Burnham_Park_Lake_(Baguio_City;_12-04-2022).jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Cebu: Joshua Lim (Sky Harbor), [Magellan's Cross](https://commons.wikimedia.org/wiki/File:Magellan%27s_Cross_full.jpg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- These three photographs are displayed with responsive CSS cropping; Baguio and Cebu use Wikimedia thumbnails. Original photographs remain under their respective licenses.

- Boracay: Choi2451, [White beach on Boracay island](https://commons.wikimedia.org/wiki/File:White_beach_on_boracay_island.jpg)
- Batanes: Johnkevinreglos, [Vayang Rolling Hills, Batanes, Philippines](https://commons.wikimedia.org/wiki/File:Vayang_Rolling_Hills,_Batanes,_Philippines.jpg)
- Siargao: CharMel Creations, [Siargao Island](https://commons.wikimedia.org/wiki/File:Siargao_Island.jpg)

## Current project status

This is a frontend design checkpoint, not a finished production release. Weekly reports, documentation submissions and personal reflections belong in the private class workspace, not this public repository.
