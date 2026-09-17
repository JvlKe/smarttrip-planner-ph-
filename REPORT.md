# SmartTrip Planner PH — Week 1 Progress Report

## Week of: September 14–20, 2026

This week focused on establishing the project structure and completing the first frontend design milestone. The main output is a responsive public landing page with sign-in and registration pages based on the proposal-stage wireframes and design system.

## Progress this week

- Organized the project into client, server, documentation, and planning sections.
- Prepared the React and Vite frontend structure and routed the public pages for the landing page, sign-in, and registration.
- Followed the proposal-stage wireframes and design system, including Nunito typography, deep teal branding, orange accents, sand-colored surfaces, rounded cards, and consistent spacing.
- Designed and implemented the landing page navigation, hero section, feature cards, four-step process, destination cards, calls to action, and footer.
- Designed and implemented the sign-in and registration pages for desktop and mobile layouts.
- Added password visibility controls, registration password guidance, form validation messages, and links between the account pages.
- Added light and dark modes to the landing and authentication pages.
- Added responsive desktop and mobile navigation with accessible focus indicators and touch-friendly controls.
- Added local destination photographs for Palawan, Boracay, Batanes, and Siargao, including image descriptions and source credits.
- Limited the Atlas assistant launcher to protected application routes so it does not cover the public or authentication pages.
- Added environment-variable examples and updated the README with the current project status and local frontend instructions.
- Checked the landing, sign-in, and registration pages at approximately 320 px, 768 px, 1024 px, and 1440 px.
- Confirmed that the checked pages had no horizontal overflow, broken images, or browser console errors.
- Ran the client production build, Prisma schema validation, and the 14 server tests. All completed successfully when the required placeholder database variables were provided.

## Purpose of this week's work

The goal for this week was to create a clear and consistent visual foundation before connecting and testing the complete authentication and trip-planning flows. Completing the public pages first established the branding, responsive behavior, shared controls, and light/dark theme that can be applied to the remaining pages.

## Mistakes I made and problems I encountered

- I initially used the Palawan photograph for every destination card and only changed its crop and color. This made Boracay, Batanes, and Siargao visually inaccurate, so I replaced them with photographs of the correct destinations.
- I accidentally allowed a shared `aside` style to affect the authentication photo panel. It forced the panel to stay 230 pixels wide and clipped the heading. I corrected the panel's position and width with page-specific styles.
- I first placed the theme button inside the form card, which caused it to overlap the “Already registered?” text on a wide screen. I moved it into the desktop top row and mobile header.
- My first dark-mode styling did not cover every part of the public pages. Some form guidance, backgrounds, links, and buttons had inconsistent contrast. I added a dedicated dark palette and checked it on desktop and mobile.
- I initially checked too much of the design from the stylesheet instead of inspecting every page in the running browser. The browser preview revealed spacing and layout problems, so I added checks at four responsive widths.
- My first full build did not include `DATABASE_URL` and `DIRECT_URL`, which caused Prisma validation to stop. I reran it with placeholder development values and the schema passed.
- Authentication has only been checked as an interface using placeholder public environment values. Real registration, sign-in, password recovery, and session persistence still need Supabase testing.
- The project is not deployed yet, so the current demonstration uses the local development server.
- I have not yet saved the final verification screenshots inside the repository.
- The dependency installation reported two moderate and four high audit findings. I still need to review the affected packages before applying upgrades.

## Remaining work

- Configure a development Supabase project and test registration, sign-in, sign-out, password recovery, protected redirects, and session persistence.
- Design and implement the password-recovery page and protected dashboard navigation.
- Apply the same responsive design and dark-mode standards to the protected pages.
- Connect and test trip creation, editing, listing, deletion, itinerary, and budget flows with the database.
- Review the dependency audit findings and apply only compatible, tested updates.
- Save screenshots of the running pages for the documentation.
- Deploy and verify the client and API after the required integrations are working.
- Continue recording completed work, test evidence, and unresolved issues in the weekly report.
