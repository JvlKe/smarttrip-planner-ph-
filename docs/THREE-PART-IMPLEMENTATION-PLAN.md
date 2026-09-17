# SmartTrip Planner PH Three Part Implementation Plan

This plan organizes the rebuild into three practical workstreams. The repository already contains substantial frontend and backend code, so each workstream begins with an audit of the existing implementation, keeps working behavior, and closes verified gaps. A feature is counted as complete only after its user flow has been tested.

## Current verified baseline

As of September 18, 2026:

- The repository contains a React and Vite client, an Express API, Prisma models and migrations, Supabase authentication integration, Leaflet maps, and AI itinerary integrations.
- `npm ci` installs the locked dependencies.
- `npm test` passes all 14 server tests when Node is allowed to start test workers.
- `npm run build` completes with placeholder database URLs, including the Vite production build and Prisma schema validation.
- These checks do not yet prove that registration, database persistence, AI providers, storage, and all authenticated production flows work with live services.

## Part 1 Frontend and User Experience

### Goal

Bring every public, authentication, and signed-in screen into one responsive SmartTrip design system while preserving all existing functionality.

### Scope

- Review the supplied design system, wireframes, dashboard reference, and existing SmartTrip branding before changing layouts.
- Preserve the deep teal palette, visible SmartTrip logo, rounded cards, Philippine travel photography, clean typography, light and dark modes, and responsive desktop and mobile navigation.
- Audit and refine the landing, sign-in, registration, password recovery, dashboard, My Trips, Create Trip, trip details, profile, settings, destinations, map, analytics, and shared-trip pages.
- Keep loading, empty, success, validation, offline, and error states understandable.
- Confirm trip search, filters, status controls, deletion confirmation, manual itinerary editing, budget views, destination photo fallback, profile photo, optional display name, password actions, theme controls, and account deletion interfaces.
- Test layouts at approximately 320 px, 768 px, 1024 px, and 1440 px.
- Fix horizontal overflow, inaccessible menus, unreadable text, broken images, small touch targets, keyboard traps, missing focus states, and weak light or dark contrast.

### Completion evidence

- Screenshots at the four target widths for the main public and authenticated flows.
- A page and component checklist showing pass, fixed, or unresolved status.
- A successful client production build.
- Keyboard navigation and visible-focus notes for navigation, dialogs, forms, and destructive actions.

### Exit criteria

- Every route renders without layout-breaking errors at the target widths.
- Navigation is usable with mouse, touch, and keyboard.
- Light and dark modes remain readable.
- Existing controls still call the intended actions; visual polish alone is not treated as feature completion.

## Part 2 Backend Data and Trip Intelligence

### Goal

Verify and complete the API, database, authentication, trip-planning logic, maps, budgets, sharing, exports, and AI-assisted tools behind the interface.

### Scope

- Verify the environment examples and keep database, Supabase service, and AI secrets on the server.
- Review the Prisma schema, migrations, indexes, and the 20-destination seed data.
- Verify Supabase registration, sign-in, password recovery, protected routes, profile updates, password change, storage-backed profile or trip photos where configured, and confirmed account deletion.
- Verify trip creation, required starting point including international locations, editing, listing, search, filters, status changes, duplication, archiving, and deletion.
- Verify both manual and AI-assisted itinerary paths, generation loading state, day and activity management, reordering, alternatives, itinerary improvement, and failure fallback.
- Verify available coordinates, geocoding safeguards, day filters, map and list views, pin export, Street View links where available, and Google Maps directions from the starting point.
- Verify budget allocation and editing, analytics, destination discovery and favorites, travel toolkit and emergency information, sharing and revocation, calendar and CSV export, print or PDF output, and the Atlas travel assistant.
- Add or update validation and automated tests for bugs found during the live-flow audit.

### Completion evidence

- Passing automated tests with the command output recorded.
- Prisma schema validation plus migration and seed evidence against a configured test database.
- Authenticated flow evidence for registration, profile update, trip creation, persistence, itinerary editing, sharing, and deletion.
- AI and map evidence that distinguishes successful provider calls from graceful fallback behavior.
- An endpoint checklist with expected success and error responses.

### Exit criteria

- Core data persists correctly for the signed-in user and cannot be accessed as another user.
- Invalid input and provider failures return useful, safe errors.
- AI output remains editable and does not bypass budget or ownership rules.
- Private keys do not appear in the client bundle or committed files.

## Part 3 Integration Quality Deployment and Documentation

### Goal

Prove that the complete system works together, deploy the client and API separately, and produce documentation that matches the verified application.

### Scope

- Run the complete user journey from account creation through trip creation, itinerary editing, map and budget review, export, sharing, and account settings.
- Recheck the four target widths on the integrated build and retest repaired flows.
- Run the production build, server tests, schema validation, and targeted regression checks.
- Deploy the Express API and Vite client as separate Vercel projects and configure exact production origins and environment values.
- Verify the deployed API health route, landing page, authentication redirect and recovery URLs, authenticated trip persistence, AI fallback, maps, sharing, and exports.
- Capture real screenshots only after the relevant screens work.
- Complete the project overview, problem and objectives, scope and limitations, target users, requirements, design system and wireframes, architecture, database diagram, feature descriptions, progress evidence, tests, deployment instructions, user guide, screenshots, known limitations, and future improvements.
- Prepare the final demonstration, presentation slides, and square project image from verified results.

### Completion evidence

- Production URLs with a dated verification checklist.
- Final test and build output.
- Screenshots from the deployed application.
- README and final documentation that use the same setup commands, environment names, feature status, and limitations as the code.

### Exit criteria

- The deployed client can reach the deployed API from its allowed origin.
- The primary authenticated flow works against the production database.
- Documentation contains no invented results, screenshots, or completion claims.
- Known limitations and future work are stated clearly.

## Weekly reporting map

Each weekly report should keep the course template headings: What changed this week, Why, What broke or what I got stuck on, and What is left. The workstream title is a focus, not permission to claim the entire section is complete.

| Reporting period | Primary workstream | Report evidence |
| --- | --- | --- |
| Week 1 | Frontend and User Experience plus baseline setup | Commits, page audit, responsive screenshots, client build, accessibility findings, unresolved UI issues |
| Week 2 | Backend Data and Trip Intelligence | API and database commits, automated tests, authenticated flow evidence, AI and map checks, unresolved service issues |
| Week 3 | Integration Quality Deployment and Documentation | Production verification, final test output, screenshots, documentation, demo materials, known limitations |

The class template currently describes formal Project Increment Reports for Weeks 1 and 2 and the final project and presentation for Week 3. If the instructor separately requires a third report, use the same report format for Part 3; otherwise, record Part 3 evidence in the final documentation and presentation materials.

## Definition of done

A task is done only when the implementation exists, the relevant flow works, the result is tested at an appropriate level, and the documentation reflects the verified behavior. Code presence, a successful build, or an unverified deployment is not enough by itself.
