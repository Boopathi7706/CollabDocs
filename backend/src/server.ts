import express from 'express';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { setupWebSocket } from './websockets/yjsHandler';
import { verifyToken } from './auth/jwt';
import { query } from './config/db';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Basic API route
app.get('/', (req, res) => {
  res.send('CollabDocs Real-time API is running');
});

// Authentication Placeholder
app.post('/api/auth/login', (req, res) => {
  // Generate a valid dummy token so verifyToken doesn't fail
  const dummyToken = jwt.sign({ id: '123', email: 'test@example.com', name: 'Test User' }, process.env.JWT_SECRET || 'super_secret_jwt_key');
  res.json({ token: dummyToken, user: { id: '123', name: 'Test User' } });
});

// Document CRUD Placeholder
app.post('/api/documents', (req, res) => {
  res.json({ id: `doc-${Date.now()}`, title: req.body.title || 'Untitled Document' });
});

const server = http.createServer(app);

// Custom WebSocket server setup without relying on y-websocket HTTP server
const wss = new WebSocketServer({ server });

const documents = new Map<string, {
  clients: Set<any>;
  ydoc: Y.Doc;
}>();

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url || "", "http://localhost");
  const docId = url.searchParams.get("docId");

  console.log("[WebSocket] Doc ID:", docId);

  const finalDocId = docId || "default-doc";
  (ws as any).docId = finalDocId;

  if (!documents.has(finalDocId)) {
    const ydoc = new Y.Doc();
    documents.set(finalDocId, {
      clients: new Set(),
      ydoc
    });

    try {
      const res = await query(
        `SELECT update_blob FROM document_updates WHERE doc_id = $1 ORDER BY created_at ASC`,
        [finalDocId]
      );
      
      res.rows.forEach(row => {
        Y.applyUpdate(ydoc, row.update_blob);
      });
    } catch (err) {
      console.error("[Document] Failed to load updates:", err);
    }

    ydoc.on("update", async (update) => {
      try {
        await query(
          `INSERT INTO documents (id, title, owner_id)
           VALUES ($1, 'Untitled Document', '00000000-0000-0000-0000-000000000000')
           ON CONFLICT (id) DO NOTHING`,
          [finalDocId]
        );

        await query(
          `INSERT INTO document_updates (doc_id, update_blob) VALUES ($1, $2)`,
          [finalDocId, update]
        );
      } catch (err) {
        console.error("[Document] Failed to save update:", err);
      }
    });
  }

  const doc = documents.get(finalDocId)!;
  doc.clients.add(ws);

  console.log("[Document] Joined:", finalDocId);
  console.log("[Document] Users:", doc.clients.size);

  const update = Y.encodeStateAsUpdate(doc.ydoc);
  ws.send(update);

  ws.on("message", (msg) => {
    Y.applyUpdate(doc.ydoc, new Uint8Array(msg as any));

    console.log("[Document] content updated", finalDocId);

    doc.clients.forEach((client) => {
      if (client !== ws && client.readyState === 1) { // 1 = OPEN
        client.send(msg);
      }
    });
  });

  ws.on("close", () => {
    console.log("[WebSocket] Client disconnected");
    doc.clients.delete(ws);
    
    if (doc.clients.size === 0) {
      documents.delete(finalDocId);
    }
  });
});

/*
// Handle upgrade requests manually to support authentication before creating a WebSocket connection
server.on('upgrade', async (request, socket, head) => {
  try {
    const url = new URL(request.url || '', `ws://${request.headers.host}`);

    // Support both path-based routing (/yjs/doc1) and query-based (?docId=doc1) like in test.html
    let docId = url.searchParams.get('docId');
    if (!docId) {
      const urlParts = url.pathname.split('/');
      docId = urlParts[urlParts.length - 1];
    }

    if (!docId || docId === 'yjs' || docId === '') {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    let token = url.searchParams.get('token');

    // Check Authorization header fallback
    if (!token && request.headers.authorization) {
      token = request.headers.authorization.replace('Bearer ', '');
    }

    // In a testing environment, bypass DB checks for the dummy test token if it's identical to the test.html token
    if (token === 'test' && docId === 'test-doc') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Fix request.url so yjsHandler cleanly parses the docId without query params
        request.url = `/${docId}`;
        (ws as any).userId = 'test-user';
        wss.emit('connection', ws, request);
      });
      return;
    }

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const user = verifyToken(token);
    if (!user) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    // Authorization Check
    const accessRes = await query(
      `SELECT 1 FROM documents WHERE id = $1 AND owner_id = $2
       UNION
       SELECT 1 FROM document_members WHERE doc_id = $1 AND user_id = $2`,
      [docId, user.id]
    );

    // if (accessRes.rows.length === 0) {
    //   socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    //   socket.destroy();
    //   return;
    // }

    // TEMPORARY: Allow test documents
    if (process.env.NODE_ENV !== "development") {
      if (accessRes.rows.length === 0) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      // Fix request.url so yjsHandler cleanly parses the docId without query params
      request.url = `/${docId}`;

      // Attach user context
      (ws as any).userId = user.id;
      wss.emit('connection', ws, request);
    });

  } catch (err) {
    console.error('[WebSocket] Upgrade error:', err);
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
  }
});
*/

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
