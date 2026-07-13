# CollabDocs — Real-Time Collaborative Document Editor

## 1. Project Overview

CollabDocs is a real-time collaborative document editing platform that allows multiple users to edit the same document simultaneously with conflict-free synchronization.

The system uses CRDT (Yjs) for real-time editing, WebSockets for communication, and PostgreSQL for persistence.

---

## 2. Core Objectives

* Enable multi-user real-time editing
* Ensure no data loss during collaboration
* Maintain consistency across clients
* Provide scalable and maintainable architecture

---

## 3. Tech Stack

### Frontend

* React (TypeScript)
* TipTap Editor (ProseMirror-based)
* Yjs (CRDT)
* WebSocket client

### Backend

* Node.js + Express
* WebSocket server (Socket.IO or ws)
* PostgreSQL

### Optional (Later Phase)

* Redis (WebSocket scaling)
* S3 (file storage)

---

## 4. High-Level Architecture

User Input → Yjs (Client)
→ WebSocket → Server (Yjs instance)
→ Broadcast → Other Clients

Persistence Flow:
Yjs Updates → Batch → PostgreSQL (updates + snapshots)

---

## 5. Data Model

### Users

* id
* email
* name
* avatar_url
* created_at

### Documents

* id
* title
* owner_id
* created_at
* updated_at

### Document Members

* doc_id
* user_id
* role (owner | editor | viewer)
* invited_at

### Document Snapshots

* id
* doc_id
* snapshot_blob (BYTEA)
* version
* created_at

### Document Updates

* id
* doc_id
* update_blob (BYTEA)
* created_at

---

## 6. Real-Time Collaboration Design

* Each document has a Yjs instance
* Clients send Yjs updates via WebSocket
* Server broadcasts updates to all users in the same document room
* Yjs ensures conflict-free merging

---

## 7. Persistence Strategy (CRITICAL)

### Update Saving

* Updates are NOT saved per keystroke
* Updates are batched every **3 seconds**
* Server merges updates and stores as a single binary blob

### Snapshot Creation

* Snapshot created every:

  * 50 updates OR
  * 60 seconds

### Compaction

* After snapshot:

  * Old updates are deleted
  * New snapshot becomes base state

---

## 8. Document Load Flow

1. Fetch latest snapshot from DB
2. Fetch updates after snapshot
3. Apply updates to reconstruct document
4. Send final state to client

---

## 9. Failure Handling

### Server Crash

* Some recent updates may be lost (within batch window)
* Client resyncs document state on reconnect

### Database Down

* Editing continues in memory (Yjs)
* Updates queued in server memory
* Retry persistence when DB is back

### Network Disconnect

* Client maintains local Yjs state
* Sync resumes automatically after reconnect

---

## 10. WebSocket Events

* JOIN_DOC
* LEAVE_DOC
* DOC_UPDATE
* CURSOR_UPDATE
* SYNC_REQUEST
* SYNC_RESPONSE

---

## 11. Security

* JWT-based authentication

* WebSocket connection validated using JWT

* Role-based access control:

  * Owner
  * Editor
  * Viewer

* Only authorized users can:

  * Join document
  * Send updates

---

## 12. MVP Scope (Strict)

* User authentication (basic)
* Create document
* Open document
* Real-time editing (multiple users)
* Save and reload document
* Basic sharing (viewer/editor)

---

## 13. Non-Goals (For Now)

* Chat system
* Notifications
* Elasticsearch
* Kubernetes
* Advanced analytics

---

## 14. Project Phases

### Phase 1 — Core Realtime

* Setup editor + Yjs
* WebSocket connection
* Multi-user sync

### Phase 2 — Persistence

* Store updates
* Implement snapshots
* Load document from DB

### Phase 3 — Auth & Access

* JWT authentication
* Role-based permissions

### Phase 4 — Stability

* Reconnect handling
* Crash recovery
* Memory cleanup

---

## 15. Key Engineering Decisions

* CRDT (Yjs) used instead of OT for conflict resolution
* PostgreSQL used for durability
* Batched persistence to avoid DB overload
* Snapshots to prevent replaying large update logs

---

## 16. Risks & Challenges

* Understanding Yjs update flow
* Debugging real-time sync issues
* Managing memory usage on server
* Ensuring data consistency between Yjs and DB

---

## 17. Future Enhancements

* Redis for horizontal scaling
* Document version history UI
* Export (PDF/DOCX)
* Comments and mentions

---

## 18. Expected Outcome

A working real-time collaborative editor with:

* Stable synchronization
* Reliable persistence
* Clean and scalable architecture

---

## 19. Local Cloudflare Tunnel Setup (Lightweight Automation)

CollabDocs comes with a lightweight development automation system that launches Cloudflare Tunnels for local collaboration in a single command.

### Setup & Usage Instructions

1. **Install cloudflared**:
   Ensure you have the Cloudflare Tunnel CLI (`cloudflared` or `cloudflared.exe`) installed globally:
   - **macOS (via Homebrew)**: `brew install cloudflared`
   - **Windows (via Winget)**: `winget install Cloudflare.cloudflared`
   - **Linux**: See official docs
   - **Manual Downloads**: [Cloudflare Tunnel Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

2. **Recommended Multi-Terminal Developer Workflow**:
   Vite loads environment variables (`import.meta.env`) during initial startup. To guarantee that the updated `VITE_API_URL` is loaded into the frontend, follow this precise startup sequence:

   * **Terminal 1 (Backend)**: Start the backend server:
     ```bash
     cd backend && npm run dev
     ```

   * **Terminal 2 (Tunnel Orchestration)**: Spin up the secure public tunnels:
     ```bash
     npm run tunnel
     ```
     This automatically:
     - Configures backend and frontend tunnels.
     - Performs a readiness polling check to ensure the tunnels are live.
     - Safely writes/updates the new URL into `frontend/.env.local` without modifying other env vars.

   * **Terminal 3 (Frontend)**: Start (or restart) your frontend dev server:
     ```bash
     cd frontend && npm run dev
     ```
     *Note: If the backend tunnel URL changes later (e.g. on restarting the tunnel script), you **must** stop the frontend dev server and restart it to guarantee Vite loads the updated `VITE_API_URL`.*

3. **Share and Collaborate**:
   - Copy the printed **Frontend URL** and share it with your collaborators!
   - Real-time synchronization and secure WebSocket connection upgrades (`wss://`) will handle routing automatically without further configuration.


