my# Admin Portal Roadmap

## Phase 1: Quick Wins (Immediate)
- [x] **Gatekeeper & Auth**: Basic passcode protection is live.
- [x] **Post Management**: CRUD operations for blog posts/insights.
- [x] **AI Integration**: Gemini/OpenAI integration for content generation.
- [x] **Basic Analytics**: View counting and "Live Viewer" estimation.

## Phase 2: Content & editing (Next Up)
### 1. Live Site Editor
**Goal**: Allow editing text and swapping images directly from the site frontend when logged as admin.
- **Tech**: `contenteditable` attributes toggled by Admin Mode.
- **Backend**: Supabase Table `site_content` to store key-value pairs for headings, hero text, etc.
- **UI**: A floating sidebar on the main site (visible only to Admin) to "Save Changes".

### 2. Media Manager V2
**Goal**: A visual grid of all uploaded assets to easily reuse content.
- **Feature**: "Select from Library" button in the Admin Post Creator.
- **Optimization**: Auto-compress images on upload using a server function or client-side canvas compression.

## Phase 3: Business & Growth (Future)
### 3. Advanced Analytics Dashboard
**Goal**: Replace estimated stats with real data.
- **Metrics**: 
    - Session duration (Heartbeat API).
    - Scroll depth tracking.
    - Button click heatmaps (e.g., "Which package is clicked most?").
- **Visuals**: Line charts for "Views over time" using `Chart.js`.

### 4. Client Portal Integration
**Goal**: Link the Admin panel to specific Client views.
- **Feature**: Create "Private Pages" for clients (e.g., `otp.tech/client/nike`).
- **Function**: Upload private video links or contracts that only that client can see via a unique passcode.

### 5. Newsletter / CRM
**Goal**: Collect emails and send updates.
- **Integration**: Sync "Contact Form" submissions to a `contacts` table (Done).
- **action**: Add a "Broadcast Email" feature to Admin to email all contacts about new Services.
