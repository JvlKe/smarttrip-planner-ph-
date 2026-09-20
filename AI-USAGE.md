# AI usage — working evidence log

Started September 20, 2026. This is a draft, not a completed badge submission. The class template and full finals-badge rubric still need to be checked. Entries below reflect this development conversation; the initial snapshot and Week 1 implementation commit are linked below. A snapshot shows resulting code, not a separate historical fix.

## 1. How AI was used

| Entry | AI assistance | Human direction evidenced in the conversation | Commit evidence |
| --- | --- | --- | --- |
| 1 | Generated React landing and account-page code | Requested those pages and the proposal reference | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| 2 | Generated CSS and responsive layouts | Required proposal colors, typography and device compatibility | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| 3 | Replaced destination images and added fallback behavior | Flagged inaccurate destination imagery | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| 4 | Assisted with Supabase configuration and connectivity checks | Selected the project directory and supplied configuration locally | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| 5 | Generated dashboard styling and shared application design | Authorized improvements while preserving the design system | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| 6 | Added the Week 1 map feature gate and scope documentation | Requested maps be deferred to Week 2 | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |

The landing page and original authentication/CSS work also appear in the [initial snapshot](https://github.com/JvlKe/smarttrip-planner-ph-/commit/8573541e8c65987f34944c0e4391ff6fdaebfb41). The Week 1 links show subsequent changes, not six independently dated work sessions. Do not backdate commits or link an unrelated earlier commit.

## 2. Where AI got it wrong

| Case | What was wrong and how it was noticed | Response | Commit evidence |
| --- | --- | --- | --- |
| Destination photography | Destination cards used inaccurate imagery; the user requested actual Boracay and other matching locations | Added destination-specific local photos and fallback presentation | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| Authentication layout | Shared sidebar styles squeezed the authentication image panel; the user supplied a screenshot of clipped text | Scoped authentication panel layout separately | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |
| Overstated AI readiness | The dashboard said the AI planner was ready even though provider configuration was not verified; the assistant caught this during review | Replaced the readiness claim with neutral planning copy | [Week 1 implementation](https://github.com/JvlKe/smarttrip-planner-ph-/commit/e924c278eb4340867175c380274f076a456f7148) |

The third case was assistant-detected, not evidence of independent student review. The student should add a genuine personally detected case with its explanation and commit if the rubric requires that.

## 3. Who wrote what

- AI generated substantial frontend, CSS, configuration, test and documentation changes in this conversation.
- The user supplied product requirements, design references, screenshots, visual feedback and scope decisions.
- Requirements, prompting and reviewing AI output are not counted here as personally authored Node/Express/PostgreSQL code.
- Independently written backend code: not yet identified or verified. No 20% claim is made.
- The student must fill in this section in their own words, naming their personally written files/functions, explaining their behavior and linking the corresponding commits. Record the rubric's measurement method before computing a percentage.

This file was drafted with AI and requires student review. The error narratives need student confirmation and precise before/after evidence; independently authored-code evidence remains incomplete.
