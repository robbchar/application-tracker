## Job Application Tracker – Plan

### Problem statement

Build a small web app that lets a job seeker **track their job applications** in one place. Each user signs in (Firebase Auth), and sees **only their own applications**, stored in Firestore. The v1 experience is a **single-page listing** with the ability to **create, edit, delete, quickly update status, and sort** applications by company name, date, and job type.

### High-level architecture

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend/services**: Firebase
  - Firebase Hosting (deploy React app as additional site in existing project)
  - Firebase Authentication (email/password + Google)
  - Cloud Firestore (per-user application documents)
- **State management**: React Query or simple hooks + context (for auth + data fetching/caching)
- **Tooling**: Yarn, Prettier, Oxlint, Husky, basic CI (GitHub Actions or similar) later

### Data & auth design

- **Auth**
  - Use Firebase Auth with **email/password + Google** providers.
  - App shows a **sign-in / sign-up view** when user is not authenticated and the **applications page** when signed in.
  - Provide both **sign-in** and **create account** flows on that auth screen (either separate tabs or a simple toggle/link).
  - Store minimal user profile in app state (UID, display name, email), no custom backend.

**Firestore data model**
  - Collection: `applications`
  - Document fields (per your notes):
    - `userId: string` – Firebase `uid` of the owner
    - `position: string`
    - `company: string`
    - `appliedDate: Timestamp`
    - `location: string`
    - `jobType: "hybrid" | "onsite" | "remote"`
    - `status: "interested" | "applied" | "interview" | "offer" | "rejected" | "archived"` (we can tweak this together)
    - `notes: string`
    - `links: Link[]`
  - Type definition for links:
    - `type Link = { title?: string; url: string }`
    - UI can offer a **dropdown of common link types** (e.g. "Application", "Cover letter", "Job description", "Other"), and when "Other" is chosen, allow a custom `title` string.
  - All Firestore queries are **scoped by `userId`** so each user only sees their own docs.

- **Security rules (conceptual)**
  - Allow read/write to `applications` **only if** `request.auth != null` and `resource.data.userId == request.auth.uid`.

### UI/UX design (v1)

- **Auth flow**
  - Simple landing/auth view with:
    - Email/password **sign-in** and **create account** flows.
    - "Continue with Google" button for sign-in/sign-up.
  - After sign-in, redirect to `ApplicationsPage`.

- **Applications page**
  - Top bar with app title and user menu (shows email/initials, sign-out button).
  - Main content:
    - **Controls row**: "Add application" button, sort dropdown (company, date, job type), optional filter by status.
    - **Listing**: a responsive table or card list showing key fields:
      - Company, position, date, job type, status, and a quick link indicator if any links exist.
    - **Row actions**:
      - Quick **status change control** (e.g. a dropdown or segmented buttons) so the user can update status without opening the full edit form.
      - "Edit" and "Delete" for each application.
  - **Form** (modal or side panel) for create/edit:
    - Fields for all required data, with enums rendered as selects and a small UI for managing the `links: Link[]` list.

### Project structure (frontend)

- `docs/thoughts.md` – expand with more design/usage notes as we go.
- `docs/plan.md` – this implementation plan in bullet form.
- `src/`
  - `main.tsx` – Vite React entry
  - `App.tsx` – app routes and layout
  - `components/` – reusable UI (buttons, inputs, layout wrappers)
  - `features/auth/` – auth context, hooks, and views (auth page)
  - `features/applications/` – list page, form, hooks for Firestore
  - `lib/firebase.ts` – Firebase initialization and typed exports
  - `types/` – shared TypeScript types (`Application`, `Link`, etc.)

### Tooling & dev workflow

- **Package manager**: Yarn (modern, node_modules mode for simplicity).
- **Linting**: Oxlint configured for TypeScript + React; keep rules reasonably strict but ergonomic.
- **Formatting**: Prettier with a minimal config.
- **Git workflow** (per your habits):
  - Initialize this directory as a Git repository and make an initial commit.
  - After initial Vite app setup, always create a **feature branch** for changes.
  - Commit **each sub-bullet of the implementation plan** with focused diffs and matching tests.
  - Always open a **pull request** for review/merge.

### Phased implementation plan (bulleted)

**Phase 1 – Base setup & documentation**
- [ ] Initialize this directory as a Git repository (`git init`) with an initial commit.
- [ ] Create `docs/plan.md` and copy this plan into it (in bullet form).
- [ ] Bootstrap Vite + React + TypeScript app using Yarn.
- [ ] Install Tailwind, Oxlint, Prettier, Husky, and basic scripts (`lint`, `format`, `typecheck`, `dev`, `build`).
- [ ] Configure TypeScript strict options and basic path aliases.
- [ ] Write/update `README.md` to describe the project, tech stack, and development commands.
- [ ] Expand `docs/thoughts.md` into a more structured design note (problem statement, data model, and roadmap).

**Phase 2 – Firebase integration (auth + data layer)**
- [ ] Add Firebase SDK and create `lib/firebase.ts` with environment-driven config.
- [ ] Set up Firebase Auth (email/password + Google) in the app:
  - [ ] Implement an `AuthProvider` using React context + hooks (typed) wrapping `onAuthStateChanged`.
  - [ ] Expose hooks like `useAuth()` that return the current user and loading/error states.
- [ ] Set up Firestore client and **typed helpers** to read/write `Application` docs, including `links: Link[]`.
- [ ] Draft conceptual Firestore security rules (to be applied in the Firebase console) based on `userId` ownership.

**Phase 3 – Core UX: auth page and applications list**
- [ ] Implement combined **auth page** using Tailwind-styled components:
  - [ ] Email/password sign-in, create-account flow, and Google button.
- [ ] Implement routing/conditional rendering in `App.tsx`:
  - [ ] Show auth page when user is unauthenticated.
  - [ ] Show `ApplicationsPage` when user is authenticated.
- [ ] Implement `ApplicationsPage` layout with Tailwind, consuming `useAuth()` for the user and `useApplications()` hook for data.
- [ ] Implement basic sorting (company, date, job type) on the client side initially (we can later move to Firestore queries if needed).

**Phase 4 – Create/Edit/Delete and status flows**
- [ ] Implement `ApplicationForm` component with strong TypeScript types and reusable input components.
- [ ] Implement **create** flow:
  - [ ] "Add application" button opens form.
  - [ ] On submit, writes new doc with `userId = currentUser.uid` and closes form.
- [ ] Implement **edit** flow:
  - [ ] Row "Edit" action populates the same form.
  - [ ] On submit, updates existing Firestore doc.
- [ ] Implement **inline status change** flow:
  - [ ] Quick status dropdown or segmented control on each row that updates `status` directly in Firestore.
- [ ] Implement **delete** flow with confirmation (dialog or inline confirmation UI).
- [ ] Add minimal error and loading states (spinners/messages) for a solid UX.

**Phase 5 – Testing, polish, and deployment**
- [ ] Add React Testing Library tests focusing on **what the user sees**:
  - [ ] Auth page renders expected controls and flows.
  - [ ] Applications list shows created applications, sorts correctly by company/date/job type.
  - [ ] Status updates reflect immediately in the UI.
  - [ ] Form validation behaves correctly from a user perspective.
- [ ] Run linters/typechecks and fix issues.
- [ ] Configure Firebase Hosting for this app as an **additional site** in your existing project (build command and output directory setup).
- [ ] Deploy v1 and verify the full flow with a couple of test accounts.


