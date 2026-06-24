# ADR 0001: Cloudflare Workers + D1 Edge Architecture

## Status
Accepted

## Context
The app is a personal daily task logger with happiness and progress tracking. It needs to be a PWA (installable, mobile-friendly). The user has an existing Cloudflare Workers + D1 project (URL shortener) and is familiar with this stack.

Alternatives considered:
- **Client-only with SQLite WASM in browser**: Truly offline-first, zero infrastructure. Rejected because the user explicitly chose edge-hosted D1 over WASM SQLite.
- **Node/Bun backend + SQLite on local disk**: Traditional full-stack. Rejected in favor of edge deployment and alignment with existing stack.
- **Supabase/Firebase**: Managed BaaS with built-in auth and realtime. Rejected - unnecessary vendor coupling for a single-user app.

## Decision
Deploy as a Cloudflare Worker serving both the API (D1 database queries) and static PWA assets (built React/Vite bundle). D1 serves as the sole data store.

## Consequences
- Single deployment: Worker handles API routes and serves static assets.
- No offline data access (see ADR 0002).
- Tied to Cloudflare platform (D1 SQL dialect, Workers runtime).
- Free tier is sufficient for a single-user app.
- Leverages existing knowledge and infrastructure patterns.
