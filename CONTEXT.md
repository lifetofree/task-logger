# Glossary

## Task Log Entry

A record of work done on a specific task, capturing subjective reflections rather than serving as a to-do item or a time tracker. Each entry represents "I worked on this task, here's how I felt and how far I got."

Core fields: task name, Happiness, Progress, Log Date.

## Happiness

A 1-5 subjective rating of how the user felt while working on a task. Represented in the UI as five emoji faces (sad to great). A per-entry input.

## Progress

A 1-5 subjective rating of how much progress was made on a task. Represented in the UI as a slider or icon row (just started, some progress, halfway, nearly done, complete). A per-entry input.

## Success Rate

A **derived** metric, not a user input. Computed from Progress values across entries. For example, the percentage of entries in a day that reached Progress level 5, or the average Progress for a given period. The user's original phrase "success rate" maps to this concept; it is not a separate field.

## Log Date

The calendar date a Task Log Entry is associated with. Defaults to today when creating an entry, but the user can change it to backfill entries for a previous day. Distinct from the system timestamps (created_at, updated_at).

## Daily Summary

A computed view aggregating all Task Log Entries for a single Log Date: average Happiness, average Progress, and total entry count.

## Day Score

The aggregated Happiness and Progress values for a given day, used to rank or color-code days (e.g., in a calendar heatmap).

## User

A registered account that owns Task Log Entries. Identified by `id` (UUID), uniquely identified by `username` (3-32 lowercase alphanumeric + underscore), authenticated by `password_hash` (bcrypt). Created via signup, authenticated via login, both endpoints return a signed JWT.

## AuthToken (JWT)

A signed JSON Web Token returned by `/api/auth/signup` and `/api/auth/login`. Sent by the client as `Authorization: Bearer <jwt>`. Contains `sub` (user id), `iat`, and `exp`. Lifetime: 7 days. Signed with `JWT_SECRET`.

## Session

The state of "this browser is authenticated as user X." On the client: stored in `localStorage` under `task-logger:jwt`. On the server: stateless (the JWT is verified on every request).
