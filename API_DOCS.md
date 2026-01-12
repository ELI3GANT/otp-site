# OTP System API Documentation

## Overview
This document outlines the API endpoints simulated or used by the OTP Admin System. The system primarily interfaces with a **Supabase** backend using the `@supabase/supabase-js` client library, but also supports a "Satellite" mode for custom Node.js backends.

## Authentication
**Method:** Token-based (Bearer)
**Storage:** `localStorage.getItem('otp_admin_token')`

## Supabase Tables (Core)

### `posts`
Stores all blog content, insights, and global system state.
- **id** (uuid): Primary Key.
- **slug** (text): Unique identifier (URL friendly).
- **title** (text): Headline.
- **content** (text): Markdown/HTML body.
- **published** (bool): Visibility toggle.
- **views** (int): Analytics counter.
- **tags** (text[]): Array of tags.
- **category** (text): Category name.

### `contacts`
Stores form submissions from the public site.
- **id** (uuid): Primary Key.
- **name** (text): Sender name.
- **email** (text): Sender email.
- **message** (text): Inquiry body.
- **service** (text): Service interest.

### `ai_archetypes`
Stores configured AI personas for the generator.
- **slug** (text): Unique ID.
- **system_prompt** (text): The "brain" of the AI.
- **model_config** (json): Temperature, tokens, etc.

## Server-Side Endpoints (Satellite Mode)
If a custom backend is linked via `otp_api_base`, the following endpoints are expected:

### `POST /api/auth/login`
Validates the admin passcode.
- **Body:** `{ "passcode": "string" }`
- **Response:** `{ "success": true, "token": "jwt_string" }`

### `POST /api/ai/generate`
Proxies requests to LLMs (OpenAI/Gemini) to hide keys.
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ "prompt": "...", "provider": "openai|gemini", "archetype": "..." }`
- **Response:** `{ "success": true, "data": { ...JSON content... } }`

### `POST /api/admin/delete-post`
Securely deletes a post.
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ "id": "uuid", "table": "posts" }`

## Realtime Channels (Supabase)

### `site_state`
Broadcasts global commands to all active visitors.
- **Events:** `command`
- **Payload:** `{ "type": "maintenance|theme|alert", "value": "..." }`

### `system`
Presence tracking for "Active Users" count.
