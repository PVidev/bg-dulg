# PRONT.md – Cursor Execution Plan (Laravel + React Service History SaaS)

> **Usage**: You (the founder) will tell Cursor which point to execute next, which to skip, and when to stop. This plan is intentionally granular (≈130 tasks) to support step-by-step implementation.

---

## 0) Project Rules & Conventions

1. Use **Laravel** as the backend (API-first).
2. Use **React** (Vite) or **Next.js** for the frontend (choose one at start).
3. Use **PostgreSQL** (recommended) or **MySQL** as the production DB.
4. No CDN installs: everything must be installed via **composer/npm** and committed properly.
5. Prefer **clean architecture**: Controllers thin, business logic in Services.
6. Use **RBAC** (roles/permissions) from day 1.
7. Multi-tenant isolation based on `service_center_id` from day 1.
8. Store no PII in VIN-shared responses (GDPR-friendly).
9. Every model has migrations + factories + seeders where useful.
10. Every endpoint has request validation + authorization policy.
11. Add an **audit log** from day 1.
12. Maintain a **CHANGELOG.md**.
13. Maintain **API docs** (OpenAPI or at least Markdown).
14. Use **.env.example** and never commit secrets.
15. Create a strict folder layout: `app/Services`, `app/Actions`, `app/Policies`.

---

## 1) Repo Setup & Tooling

16. Create a GitHub repo structure: `/server` and `/client`.
17. Add root `README.md` describing stack and local setup.
18. Add root `.editorconfig`.
19. Add root `.gitattributes`.
20. Add root `.gitignore` (Laravel + Node).
21. Add CI config (GitHub Actions) for backend tests.
22. Add CI config for frontend build.
23. Add a `docs/` folder for architecture notes.
24. Add `docs/DECISIONS.md` (Architecture Decision Records style).
25. Add `docs/SECURITY.md`.
26. Add `docs/LEGAL.md`.

---

## 2) Backend Installation (Local, Composer)

27. Create Laravel project in `/server` via Composer.
28. Configure PHP version requirements.
29. Create `.env.example` and fill all needed keys.
30. Configure DB connection (PostgreSQL/MySQL).
31. Run migrations baseline.
32. Install Laravel Sanctum (API auth).
33. Publish Sanctum config.
34. Configure CORS for local frontend.
35. Add API rate limiting defaults.
36. Set up logging channels (daily logs).
37. Add `APP_URL` and trusted proxies.

---

## 3) Frontend Installation (Local, NPM)

38. Choose frontend: **React (Vite)** OR **Next.js**.
39. Create project in `/client`.
40. Add ESLint + Prettier.
41. Add environment config (`.env.example`) with `VITE_API_URL` or `NEXT_PUBLIC_API_URL`.
42. Add router (React Router) if Vite.
43. Add state management minimal (React Query recommended).
44. Add UI component library or design system (optional).
45. Add authentication state (token storage strategy).

---

## 4) Database Core Schema (Migrations)

46. Create migration: `service_centers`.
47. Add indexes: name, subscription_status.
48. Create migration: `users` with `service_center_id`.
49. Add unique index on email.
50. Create migration: `customers` with `service_center_id`.
51. Index: service_center_id, phone, name.
52. Create migration: `vehicles` with `service_center_id`, `customer_id`.
53. Index: service_center_id + vin, plate_number.
54. Create migration: `service_records` with `service_center_id`, `vehicle_id`, `vin`.
55. Index: vin, service_date, visibility.
56. Add composite index: (vin, visibility).
57. Create migration: `audit_logs`.
58. Index: service_center_id, user_id, created_at.
59. Add soft deletes where appropriate (customers/vehicles optional).
60. Add `meta`/settings table (optional): `service_center_settings`.

---

## 5) Seed Data & Factories

61. Create factories for service_center.
62. Create factories for users.
63. Create factories for customers.
64. Create factories for vehicles.
65. Create factories for service_records.
66. Create a seeder: demo tenant with admin user.
67. Create a seeder: sample records for development.

---

## 6) Authentication & Tenancy Foundation

68. Implement auth endpoints: register/login/logout.
69. Use Sanctum tokens for API.
70. Add middleware: `auth:sanctum` for protected routes.
71. Implement **TenantResolver** (derive `service_center_id` from logged-in user).
72. Add middleware: `tenant.enforce` to set tenant context.
73. Ensure every create/list/update/delete query is scoped by `service_center_id`.
74. Block cross-tenant access at Policy level.
75. Add a helper: `tenant()` function or TenantContext service.

---

## 7) Roles & Permissions (RBAC)

76. Install Spatie Laravel Permission.
77. Publish config and run migrations.
78. Define roles: `admin`, `mechanic`, `accountant`.
79. Define permissions for each module.
80. Seed roles and base permissions.
81. Add middleware: `role` / `permission` guards.
82. Implement admin-only endpoints for user management.

---

## 8) Audit Logging

83. Implement `AuditLogger` service.
84. Add audit log entries on create/update/delete for key entities.
85. Include: user_id, service_center_id, action, entity_type, entity_id, ip.
86. Add endpoint to view audit logs (admin).
87. Add filtering by date/entity.

---

## 9) Core CRUD APIs (Backend)

### Customers

88. Create Customer model, controller, requests.
89. Endpoints: list/create/update/delete.
90. Add validation rules.
91. Add policies for Customer.

### Vehicles

92. Create Vehicle model, controller, requests.
93. Endpoints: list/create/update/delete.
94. Add validation for VIN/plate formats.
95. Add policies for Vehicle.

### Service Records

96. Create ServiceRecord model, controller, requests.
97. Endpoints: list/create/update/delete.
98. Add validation for price/service_date.
99. Add policies for ServiceRecord.
100. Ensure service_record stores vin redundantly (for fast VIN lookup).

---

## 10) VIN Search & Sharing Logic (Core Differentiator)

101. Add column `visibility` enum: `private/shared`.
102. Add endpoint: `GET /api/v1/vin/{vin}`.
103. Logic: return own tenant records + shared records from other tenants.
104. Ensure response excludes all PII fields.
105. Add rate limiting for VIN search.
106. Add audit log entry for VIN search access.
107. Add toggle: allow tenant to enable/disable sharing.
108. Add endpoint: mark record shared/private.
109. Add safeguards: no sharing if subscription not eligible.

---

## 11) Reports (MVP)

110. Create endpoint: revenue summary by date range.
111. Create endpoint: top repairs / categories (if you have categories).
112. Create endpoint: vehicles count, records count.
113. Add export endpoint (CSV) for service records.
114. Add basic filtering: by customer, vehicle, VIN, date.

---

## 12) Frontend Pages (MVP)

115. Implement login page.
116. Implement protected layout.
117. Dashboard: KPIs + quick links.
118. Customers: table + create/edit form.
119. Vehicles: table + create/edit form.
120. Service records: table + create/edit form.
121. VIN search page: input + results list.
122. Add role-based UI restrictions.
123. Add loading/error states.
124. Add pagination and search.

---

## 13) Subscription & Billing (Stripe + Cashier)

125. Install Laravel Cashier.
126. Configure Stripe keys in `.env`.
127. Create plans: Basic/Pro/Enterprise.
128. Implement checkout session endpoint.
129. Implement customer portal endpoint.
130. Set up Stripe webhooks route.
131. Implement webhook handler and subscription status updates.
132. Add middleware: `subscribed:pro` for VIN sharing.
133. Add UI billing page: plan selection + manage billing.
134. Add grace period behavior (optional).

---

## 14) Security Hardening (MVP+)

135. Enforce HTTPS in production.
136. Add strict CORS allowlist.
137. Add request throttling for auth endpoints.
138. Add input sanitization guidelines.
139. Prevent ID enumeration (optional: UUIDs).
140. Store secrets only in env.
141. Add content security policy (frontend, if applicable).
142. Add database backups strategy (document + script).

---

## 15) GDPR & Legal (MVP+)

143. Implement data export per tenant.
144. Implement deletion/anonymization workflow.
145. Add consent/notice text inside app.
146. Add Terms of Service + Privacy Policy drafts in `/docs`.
147. Add DPA outline for B2B clients.
148. Add “shared data is as-is” disclaimer in UI.

---

## 16) Testing & QA

149. Add feature tests for auth.
150. Add tests for tenant isolation.
151. Add tests for VIN search filtering.
152. Add tests for subscription gating.
153. Add frontend smoke tests (optional).
154. Add seed-based demo for QA.
155. Add lint checks and format checks in CI.

---

## 17) Deployment & Operations

156. Choose hosting: VPS (recommended) or managed.
157. Provision database (managed DB recommended).
158. Configure environment variables on server.
159. Set up queue worker (Redis) if needed.
160. Set up scheduled tasks (Laravel scheduler).
161. Set up log rotation and monitoring.
162. Configure backups (daily) and retention.
163. Configure domain + SSL.
164. Set up deployment pipeline.

---

## 18) Productization & Support

165. Add onboarding wizard for first-time setup.
166. Add in-app help page + FAQ.
167. Add “contact support” flow.
168. Add changelog visible to users.
169. Add error reporting (Sentry optional).
170. Create admin super-panel (platform owner) to manage tenants.

---

## 19) Future (Post-MVP) Enhancements

171. Multi-location per service center.
172. Inventory/parts module.
173. Invoice module.
174. SMS reminders.
175. Accounting export integration.
176. Insurance integration.
177. API for third-party integrations.
178. Predictive maintenance analytics.
179. Mobile companion app.

---

## 20) Local Install Notes (No CDN)

180. Provide a single installation guide:

* Install PHP + Composer + Node + DB
* `cd server && composer install`
* `cp .env.example .env && php artisan key:generate`
* configure DB
* `php artisan migrate --seed`
* `php artisan serve`
* `cd client && npm install && npm run dev`

181. Provide a one-command dev script (optional) to start both.
182. Document Windows-specific setup (PHP extensions, OpenSSL, etc.).
183. Add troubleshooting section (common errors).

---

## 21) Cursor Operating Instructions

184. Cursor role: **Senior Full-Stack Engineer** (Laravel + React).
185. Cursor must implement only the requested point(s) you specify.
186. Cursor must keep changes small and commit-ready.
187. After each point, Cursor must report:

* files changed
* commands to run
* quick verification steps

188. Cursor must not refactor unrelated code.
189. Cursor must add comments only when helpful.
190. Cursor must keep security in mind for every endpoint.

---

## ✅ Done Criteria (MVP)

191. One service center can fully manage customers/vehicles/records.
192. Tenant isolation is enforced everywhere.
193. VIN search shows shared records only (no PII).
194. Subscription gating works.
195. Basic reports and exports work.
196. Deployed and usable by first paying customers.

---

**End of PRONT.md**
