# CausalFunnel User Analytics Assignment

A small full-stack analytics application that tracks `page_view` and `click` events, stores them in MongoDB, and visualizes sessions and page clicks in a React dashboard.

## Tech Stack

- React + Vite dashboard
- Node.js + Express API
- MongoDB + Mongoose for event storage
- Plain JavaScript tracking snippet served by the backend

## Features

- Drop-in tracker script with persistent `session_id`
- Tracks page views and clicks with URL, timestamp, viewport, and coordinates
- API endpoints for event ingestion, sessions, session journeys, pages, and heatmap data
- Dashboard with Sessions and Heatmap views
- Demo storefront page for quick local testing

## Setup

1. Install root dependencies:

   ```bash
   npm install
   ```

2. Install backend and frontend dependencies:

   ```bash
   npm run install:all
   ```

3. Start MongoDB locally, or use Docker:

   ```bash
   docker compose up -d
   ```

   This project maps MongoDB to local port `27018` to avoid conflicts with any existing MongoDB running on `27017`.

4. Copy the server env file:

   ```bash
   cp server/.env.example server/.env
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

6. Open:

   - Dashboard: `http://localhost:5173`
   - Demo page: `http://localhost:4000/demo`
   - Tracker script: `http://localhost:4000/tracker.js`

## API

- `POST /api/events` - receive and store analytics events
- `GET /api/sessions` - list sessions with event counts
- `GET /api/sessions/:sessionId/events` - fetch ordered events for one session
- `GET /api/pages` - list tracked page URLs
- `GET /api/heatmap?url=<page-url>` - fetch click positions for one page

## Tracking Snippet

Add this before the closing `</body>` tag of any page:

```html
<script
  src="http://localhost:4000/tracker.js"
  data-endpoint="http://localhost:4000/api/events"
></script>
```

## Assumptions And Trade-offs

- `session_id` is stored in `localStorage` and mirrored to a cookie for inspectability.
- Click coordinates use page-level coordinates (`pageX`, `pageY`) and include viewport/document dimensions for heatmap scaling.
- The dashboard polls on refresh rather than using websockets, keeping the implementation simple and assignment-focused.
- MongoDB is the intended datastore. The API is designed around Mongoose models and indexes for session and page queries.
