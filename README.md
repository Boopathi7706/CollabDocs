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
