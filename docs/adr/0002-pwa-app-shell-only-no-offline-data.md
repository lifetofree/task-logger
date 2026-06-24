# ADR 0002: PWA for Installability Only, No Offline Data

## Status
Accepted

## Context
The app is a PWA backed by Cloudflare Workers + D1 (server-side database). True offline data access would require either an offline write queue (IndexedDB + sync logic) or a local-first architecture (SQLite WASM + background sync to D1). Both approaches roughly double implementation complexity for a single-user personal tool.

Alternatives considered:
- **Offline read-only via cache**: Marginal value for a daily-use tool where the user almost always has connectivity.
- **Offline write queue with IndexedDB**: Full offline capability but significant complexity (queue management, retry, conflict resolution) disproportionate to benefit.
- **Local-first with SQLite WASM + sync to D1**: Maximum offline capability but highest complexity and architectural divergence from the chosen D1-centric model.

## Decision
The service worker caches only the **app shell** (HTML, CSS, JS, images). The app is installable, opens instantly from cache, and feels native. All data operations (create, read, update, delete) require a network connection to the Worker API. When offline, the app displays an offline state message.

## Consequences
- Simple service worker configuration via `vite-plugin-pwa`.
- No IndexedDB, no sync logic, no conflict resolution.
- Users cannot log entries without connectivity.
- App is installable and fast-opening, which delivers the primary PWA benefits.
- If offline data becomes a requirement later, it can be layered on without changing the core architecture.
