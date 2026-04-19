project: multi-service-integrator
version: 0.2.1
tech_stack:
  frontend: Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui-compatible custom components
  backend: Next.js Route Handlers, Firebase Admin SDK
  database: Firebase RTDB (multi-shard)
  auth: NextAuth v5
  state: Zustand + IndexedDB (Dexie)
  crypto: Node.js crypto (AES-256-GCM)

current_agent: chatgpt

tasks:
  - task_id: T-001
    title: "Project Bootstrap"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:20:00+07:00
    completed_at: 2026-04-18T14:30:00+07:00
    files_changed:
      - /package.json
      - /tsconfig.json
      - /next.config.ts
      - /tailwind.config.ts
      - /postcss.config.js
      - /.env.example
      - /.gitignore
      - /.cursorrules
      - /src/app/layout.tsx
      - /src/app/page.tsx
      - /src/app/globals.css
      - /src/types/global.d.ts
      - /src/types/service.d.ts
      - /STANDARDS.md
    notes: "Initialized project structure, root app layout, environment template, and shared base types."

  - task_id: T-101
    title: "Firebase Multi-Project ShardManager"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:31:00+07:00
    completed_at: 2026-04-18T14:42:00+07:00
    files_changed:
      - /src/lib/firebase/index.ts
      - /src/lib/firebase/FirebaseAdmin.ts
      - /src/lib/firebase/FirebaseClient.ts
      - /src/lib/firebase/ShardSelector.ts
      - /src/lib/firebase/ShardManager.ts
      - /tests/unit/ShardManager.test.ts
    notes: "Implemented shard discovery, admin/client initialization, health checks, and index-aware reads/writes."

  - task_id: T-102
    title: "AES-256 Crypto Module"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:42:00+07:00
    completed_at: 2026-04-18T14:47:00+07:00
    files_changed:
      - /src/lib/crypto/AesCrypto.ts
      - /src/lib/crypto/FieldEncryptor.ts
      - /src/lib/crypto/index.ts
      - /tests/unit/AesCrypto.test.ts
    notes: "Implemented AES-256-GCM primitives and service-aware field encryption."

  - task_id: T-103
    title: "Audit Logger"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:47:00+07:00
    completed_at: 2026-04-18T14:55:00+07:00
    files_changed:
      - /src/lib/logger/index.ts
      - /src/lib/logger/AuditLogger.ts
      - /src/lib/logger/OperationLogger.ts
      - /tests/unit/AuditLogger.test.ts
    notes: "Implemented buffered audit logging and local-first operation log persistence."

  - task_id: T-104
    title: "Local Cache (Zustand + IndexedDB)"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:55:00+07:00
    completed_at: 2026-04-18T15:05:00+07:00
    files_changed:
      - /src/lib/db/index.ts
      - /src/lib/db/LocalDb.ts
      - /src/lib/db/SyncManager.ts
      - /src/lib/store/index.ts
      - /src/lib/store/AppStore.ts
      - /src/lib/store/ServiceStore.ts
      - /tests/unit/LocalDb.test.ts
    notes: "Implemented Dexie schema, optimistic sync queue, and shared app/service stores."

  - task_id: T-201
    title: "NextAuth v5 Multi-Provider Setup"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:20:00+07:00
    completed_at: 2026-04-18T15:40:00+07:00
    files_changed:
      - /src/lib/auth/index.ts
      - /src/lib/auth/auth.ts
      - /src/lib/auth/providers/google.ts
      - /src/lib/auth/providers/supabase.ts
      - /src/lib/auth/providers/custom.ts
      - /src/app/api/auth/[...nextauth]/route.ts
      - /src/app/login/page.tsx
      - /src/types/next-auth.d.ts
    notes: "Implemented Auth.js with Google, Supabase, and custom credentials providers."

  - task_id: T-202
    title: "Auth Middleware & Route Protection"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:40:00+07:00
    completed_at: 2026-04-18T15:48:00+07:00
    files_changed:
      - /middleware.ts
      - /src/lib/auth/withAuth.ts
    notes: "Implemented route protection for dashboard and API surfaces."

  - task_id: T-301
    title: "BaseService Abstract Class & ServiceRegistry"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:05:00+07:00
    completed_at: 2026-04-18T15:15:00+07:00
    files_changed:
      - /src/services/_base/BaseSchema.ts
      - /src/services/_base/BaseService.ts
      - /src/services/_registry/ServiceRegistry.ts
      - /src/services/_registry/index.ts
      - /src/services/_registry/serviceMeta.ts
      - /src/services/_registry/serviceForms.ts
      - /tests/unit/BaseService.test.ts
    notes: "Implemented shared service persistence, exports/imports, update flow, registry, metadata, and dynamic form definitions."

  - task_id: T-302
    title: "Generic API Routes cho mọi Service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:00:00+07:00
    completed_at: 2026-04-18T16:18:00+07:00
    files_changed:
      - /src/app/api/services/[type]/route.ts
      - /src/app/api/services/[type]/[id]/route.ts
      - /src/app/api/services/[type]/[id]/fetch/route.ts
      - /src/app/api/services/[type]/[id]/sub/[subType]/route.ts
      - /src/app/api/services/[type]/[id]/sub/[subType]/[resourceId]/route.ts
      - /src/lib/utils/api.ts
    notes: "Implemented generic CRUD, metadata refresh, and sub-resource route handlers."

  - task_id: T-401
    title: "GitHub Service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:48:00+07:00
    completed_at: 2026-04-18T15:57:00+07:00
    files_changed:
      - /src/services/github/types.ts
      - /src/services/github/GithubSchema.ts
      - /src/services/github/GithubApi.ts
      - /src/services/github/GithubService.ts
      - /src/services/github/index.ts
    notes: "Implemented GitHub account validation, metadata hydration, repo/workflow/webhook operations, and registry registration."

  - task_id: T-402
    title: "Cloudflare Service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:57:00+07:00
    completed_at: 2026-04-18T16:05:00+07:00
    files_changed:
      - /src/services/cloudflare/types.ts
      - /src/services/cloudflare/CloudflareSchema.ts
      - /src/services/cloudflare/CloudflareApi.ts
      - /src/services/cloudflare/CloudflareService.ts
      - /src/services/cloudflare/index.ts
    notes: "Implemented Cloudflare account validation, zone/tunnel/DNS access, and tunnel/DNS mutation flows."

  - task_id: T-403
    title: "Supabase Service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:05:00+07:00
    completed_at: 2026-04-18T16:12:00+07:00
    files_changed:
      - /src/services/supabase/types.ts
      - /src/services/supabase/SupabaseSchema.ts
      - /src/services/supabase/SupabaseApi.ts
      - /src/services/supabase/SupabaseService.ts
      - /src/services/supabase/index.ts
    notes: "Implemented Supabase validation, metadata derivation, project/table/function listing, and registry registration."

  - task_id: T-404
    title: "Resend Service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:12:00+07:00
    completed_at: 2026-04-18T16:16:00+07:00
    files_changed:
      - /src/services/resend/types.ts
      - /src/services/resend/ResendSchema.ts
      - /src/services/resend/ResendApi.ts
      - /src/services/resend/ResendService.ts
      - /src/services/resend/index.ts
    notes: "Implemented Resend account validation, metadata hydration, domain listing, and API key management."

  - task_id: T-405
    title: "Google Credentials Service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:16:00+07:00
    completed_at: 2026-04-18T16:24:00+07:00
    files_changed:
      - /src/services/google-creds/types.ts
      - /src/services/google-creds/GoogleCredsSchema.ts
      - /src/services/google-creds/GoogleCredsApi.ts
      - /src/services/google-creds/GoogleCredsService.ts
      - /src/services/google-creds/index.ts
    notes: "Implemented credential-type-aware Google validation, metadata extraction, and GCP project listing."

  - task_id: T-501
    title: "Layout & Shell Components"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:30:00+07:00
    completed_at: 2026-04-18T15:58:00+07:00
    files_changed:
      - /src/components/layout/index.ts
      - /src/components/layout/AppShell.tsx
      - /src/components/layout/Sidebar.tsx
      - /src/components/layout/Header.tsx
      - /src/components/layout/UserMenu.tsx
      - /src/components/layout/NotificationPanel.tsx
      - /src/components/providers/DashboardSessionBridge.tsx
      - /src/app/dashboard/layout.tsx
    notes: "Implemented protected shell, sidebar, header, session bridge, and notification flyout."

  - task_id: T-502
    title: "Service Dashboard Page (Generic)"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:58:00+07:00
    completed_at: 2026-04-18T16:22:00+07:00
    files_changed:
      - /src/app/dashboard/page.tsx
      - /src/app/dashboard/services/[type]/page.tsx
      - /src/app/dashboard/services/[type]/[id]/page.tsx
      - /src/components/services/_shared/index.ts
      - /src/components/services/_shared/AccountList.tsx
      - /src/components/services/_shared/AccountCard.tsx
      - /src/components/services/_shared/AddAccountModal.tsx
      - /src/components/services/_shared/DynamicForm.tsx
      - /src/components/services/_shared/SubResourcePanel.tsx
      - /src/lib/hooks/useServiceAccounts.ts
      - /src/lib/hooks/useSubResources.ts
    notes: "Implemented generic account listing, detail pages, dynamic creation modal, and sub-resource UI."

  - task_id: T-503
    title: "Operation Log & Audit Log UI"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:22:00+07:00
    completed_at: 2026-04-18T16:30:00+07:00
    files_changed:
      - /src/app/dashboard/logs/page.tsx
      - /src/components/logs/index.ts
      - /src/components/logs/AuditLogTable.tsx
      - /src/components/logs/OperationLogDrawer.tsx
      - /src/components/logs/ApiCallDetail.tsx
      - /src/app/api/admin/logs/route.ts
    notes: "Implemented audit/operation log screen and detail drawer backed by RTDB log data."

  - task_id: T-601
    title: "Export/Import System"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:30:00+07:00
    completed_at: 2026-04-18T16:38:00+07:00
    files_changed:
      - /src/lib/export/index.ts
      - /src/lib/export/ExportBuilder.ts
      - /src/lib/export/ImportValidator.ts
      - /src/lib/export/formats/JsonExporter.ts
      - /src/lib/export/formats/CsvExporter.ts
      - /src/app/api/services/export/route.ts
      - /src/app/api/services/import/route.ts
    notes: "Implemented JSON/CSV export builders, checksum validation, and import endpoints."

  - task_id: T-701
    title: "Performance Optimization"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:38:00+07:00
    completed_at: 2026-04-18T16:46:00+07:00
    files_changed:
      - /src/lib/hooks/index.ts
      - /src/lib/hooks/useServiceList.ts
      - /src/lib/hooks/useServiceDetail.ts
      - /src/lib/hooks/useInfiniteList.ts
      - /src/components/services/_shared/VirtualList.tsx
    notes: "Implemented cached list/detail hooks and a lightweight virtual list for large collections."

  - task_id: T-702
    title: "Error Boundary & Loading States"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T15:34:00+07:00
    completed_at: 2026-04-18T15:42:00+07:00
    files_changed:
      - /src/components/ui/index.ts
      - /src/components/ui/ErrorBoundary.tsx
      - /src/components/ui/SkeletonCard.tsx
      - /src/components/ui/EmptyState.tsx
    notes: "Implemented skeleton placeholders and empty-state primitives. Note: error.tsx and not-found.tsx at app root are pending."

  - task_id: T-801
    title: "Docker & Deployment Config"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T16:46:00+07:00
    completed_at: 2026-04-18T16:52:00+07:00
    files_changed:
      - /Dockerfile
      - /docker-compose.yml
      - /docker-compose.prod.yml
      - /.github/workflows/ci.yml
      - /scripts/generate-encryption-key.sh
    notes: "Implemented container build, compose files, and CI workflow."

  - task_id: T-802
    title: "STANDARDS.md hoàn chỉnh"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:26:00+07:00
    completed_at: 2026-04-18T14:30:00+07:00
    files_changed:
      - /STANDARDS.md
    notes: "Created coding standards, error registry, API response format, and PR checklist."

  - task_id: T-803
    title: "PROJECT_MEMORY.md khởi tạo"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T14:24:00+07:00
    completed_at: 2026-04-18T14:30:00+07:00
    files_changed:
      - /PROJECT_MEMORY.md
    notes: "Initialized and fully updated project memory for all tasks."


  - task_id: T-504
    title: "GitHub Service UI Optimization (cache-first actions flow)"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T17:10:00+07:00
    completed_at: 2026-04-18T17:45:00+07:00
    files_changed:
      - /src/services/github/types.ts
      - /src/services/github/GithubApi.ts
      - /src/services/github/GithubService.ts
      - /src/components/services/_shared/GithubActionsPanel.tsx
      - /src/app/dashboard/services/[type]/[id]/page.tsx
    notes: "Implemented cache-first org/repo/workflow/run/log/secret flow for GitHub account detail. Added manual refresh semantics (refresh=1) to reduce GitHub API calls and converted GitHub detail UI to combo + action buttons workflow."


  - task_id: T-505
    title: "Cloudflare Service UI Optimization (cache-first actions flow)"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T18:00:00+07:00
    completed_at: 2026-04-18T18:40:00+07:00
    files_changed:
      - /src/services/cloudflare/types.ts
      - /src/services/cloudflare/CloudflareApi.ts
      - /src/services/cloudflare/CloudflareService.ts
      - /src/components/services/_shared/CloudflareActionsPanel.tsx
      - /src/app/dashboard/services/[type]/[id]/page.tsx
    notes: "Implemented Cloudflare cache-first control flow with zones/domains, nameservers, tunnels, tunnel token, connector disconnect, and DNS create/update/delete actions using combo + button interactions."


  - task_id: T-506
    title: "GitHub repo file/zip actions + Azure DevOps service"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-18T19:00:00+07:00
    completed_at: 2026-04-18T20:00:00+07:00
    files_changed:
      - /src/services/github/types.ts
      - /src/services/github/GithubApi.ts
      - /src/services/github/GithubService.ts
      - /src/components/services/_shared/GithubActionsPanel.tsx
      - /src/services/azure/types.ts
      - /src/services/azure/AzureSchema.ts
      - /src/services/azure/AzureApi.ts
      - /src/services/azure/AzureService.ts
      - /src/services/azure/index.ts
      - /src/components/services/_shared/AzureActionsPanel.tsx
      - /src/services/_registry/index.ts
      - /src/services/_registry/serviceMeta.ts
      - /src/services/_registry/serviceForms.ts
      - /src/types/service.d.ts
      - /src/app/dashboard/services/[type]/[id]/page.tsx
    notes: "Added GitHub repository zip + file-content actions and introduced Azure DevOps PAT-based service with cache-first project/repo/pipeline/run/file/zip workflows and dedicated UI panel."


  - task_id: T-507
    title: "RTDB multi-project replication + backfill sync"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-19T08:10:00+00:00
    completed_at: 2026-04-19T09:00:00+00:00
    files_changed:
      - /src/lib/firebase/ShardManager.ts
      - /src/lib/firebase/index.ts
    notes: "Implemented multi-project replication markers (replicatedShards), fixed shard_index placement on deterministic index shard, added read fallback across shards, and background backfill for newly added shards so old records sync once and are marked to avoid re-sync loops."


  - task_id: T-508
    title: "Azure PAT-first onboarding + organization/project/repo/pipeline improvements"
    status: DONE
    agent: chatgpt
    started_at: 2026-04-19T09:10:00+00:00
    completed_at: 2026-04-19T10:00:00+00:00
    files_changed:
      - /src/services/azure/types.ts
      - /src/services/azure/AzureApi.ts
      - /src/services/azure/AzureSchema.ts
      - /src/services/azure/AzureService.ts
      - /src/components/services/_shared/AzureActionsPanel.tsx
      - /src/services/_registry/serviceForms.ts
    notes: "Switched Azure add-account flow to PAT-first (organization optional), added organization discovery via PAT, pagination token support on list endpoints, organization-aware caching keys, and pipeline creation from repo YAML in Azure actions panel."

found_bugs: []

pending_files: []

notes: >
  Full scaffold and implementation pass completed. Runtime verification against
  installed dependencies and live provider credentials is still required.
  currentConfig instance-mutation pattern has been refactored — validateCredentials
  and fetchMetadata now accept config as an optional second parameter.
  Project memory has been aligned with the actual codebase and the local plan.md
  required by AGENTS.md now exists inside the repository root.
  Applied ZIP-aligned bugfix sync on 2026-04-18 for P0/P1/P2 items: Next.js 15
  async params in withAuth, keyHex forwarding in AesCrypto/FieldEncryptor, fixed
  AesCrypto tests, shard_index summary cache to remove N+1 reads in list(), and
  lazy shard initialization for graceful dev/test mode.
  Additional dev-run stabilization on 2026-04-18: aligned Tailwind stack to
  tailwindcss@3.4.x with PostCSS tailwindcss/autoprefixer plugin, and removed
  client import chain from NotificationPanel to OperationLogger that pulled in
  firebase-admin (net/tls) on dashboard compile.
  Build stabilization on 2026-04-18: fixed unterminated template/join string in
  GithubApi log preview, pinned libsodium-wrappers to 0.7.15 to avoid missing
  modules-esm/libsodium.mjs resolution in Next build, aligned withAuth/app auth
  provider typing for Next.js 15 route context and NextAuth unions, and added
  BaseService config/credential casts to satisfy strict RTDBNode record typing.
  UI readability fix on 2026-04-18: set explicit dark input text color and
  placeholder color for AddAccountModal/DynamicForm fields to prevent invisible
  user-entered text on white input backgrounds in dark theme modal.
  Runtime fix on 2026-04-18: FirebaseAdmin now reuses existing global admin app
  instances by shard name (from admin.apps) before calling initializeApp, which
  prevents duplicate app-name errors during Next.js dev hot reloads.
  Form control standardization on 2026-04-18: introduced global reusable
  classes msi-field and msi-field-dark in globals.css and migrated all current
  project input/select/textarea usages (service forms, sub-resource panel,
  search fields, and login credentials) to these shared styles for consistent
  text visibility and focus states.

standardization_notes:
  - "Removed stale route-group references; canonical app folders are /src/app/login and /src/app/dashboard."
  - "Generated file tsconfig.tsbuildinfo is excluded from repository."
  - "Created previously missing files referenced by PROJECT_MEMORY: AuthAdapter.ts, RtdbRules.ts, AuthSessionProvider.tsx, error.tsx, and not-found.tsx."
  - "Copied plan.md into the repository root to satisfy the AGENTS.md golden workflow."
