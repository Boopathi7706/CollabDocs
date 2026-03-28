import { WebSocket, RawData } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { joinDocument, leaveDocument, handleUpdate } from '../managers/documentManager';

/**
 * Handles incoming WebSocket connections for a specific document without y-websocket.
 * Uses raw Yjs protocols (sync messages) and explicitly controls the lifecycle.
 */
export async function setupWebSocket(ws: WebSocket, req: any) {
  const urlParts = req.url.split('/');
  const docId = urlParts[urlParts.length - 1];

  if (!docId) {
    ws.close(1008, 'Document ID required');
    return;
  }

  try {
    // 1. Join document manager (Load doc + Attach client)
    const ydoc = await joinDocument(docId, ws);

    // 2. Initial Sync Step 1: Request state vector from client
    // By sending sync step 1, we ask the client to tell us what it already has.
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0); // messageType = 0 (sync)
    syncProtocol.writeSyncStep1(encoder, ydoc);
    ws.send(encoding.toUint8Array(encoder));

    // 3. Handle incoming raw binary updates safely
    ws.on('message', (message: RawData) => {
      try {
        if (!(message instanceof Buffer) && !(message instanceof ArrayBuffer) && !ArrayBuffer.isView(message)) {
          throw new Error('Invalid incoming transport type');
        }

        const update = new Uint8Array(message as ArrayBuffer);
        const decoder = decoding.createDecoder(update);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === 0) {
          // 0 = sync protocol (Step 1, Step 2, or Update)
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, 0);
          
          const replyNeeded = syncProtocol.readSyncMessage(decoder, encoder, ydoc, ws);
          
          if (replyNeeded) {
            ws.send(encoding.toUint8Array(encoder));
          }

          // Relay native update 
          handleUpdate(docId, update, ws);
        }
      } catch (err) {
        console.error(`[WebSocket] Safety protocol triggered on invalid message:`, err);
      }
    });

    // 4. Handle Lifecycle: Client disconnects
    ws.on('close', () => {
      leaveDocument(docId, ws);
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket] Error for client on doc ${docId}:`, err);
      leaveDocument(docId, ws);
    });

  } catch (err) {
    console.error(`[WebSocket] Failed to setup WS for doc ${docId}:`, err);
    ws.close(1011, 'Internal server error loading document');
  }
}
