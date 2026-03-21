import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { loadDocumentFromDB } from '../services/documentLoader';
import { persistBatchedUpdate, createSnapshot } from '../services/dbPersistence';

const UPDATE_BATCH_TIMEOUT = 3000;
const SNAPSHOT_UPDATE_COUNT_THRESHOLD = 50;
const SNAPSHOT_TIME_THRESHOLD = 60000;

interface DocumentState {
  doc: Y.Doc;
  connections: Set<WebSocket>;
  pendingUpdates: Uint8Array[];
  updateCount: number;
  lastSnapshotTime: number;
  timeoutId: NodeJS.Timeout | null;
}

// In-Memory map of active documents being edited
const activeDocuments = new Map<string, DocumentState>();
const loadingLocks = new Map<string, Promise<Y.Doc>>();

/**
 * Ensures the document is loaded into memory and attaches the user connection.
 */
export async function joinDocument(docId: string, ws: WebSocket): Promise<Y.Doc> {
  let state = activeDocuments.get(docId);

  if (!state) {
    let lock = loadingLocks.get(docId);
    if (!lock) {
      console.log(`[DocumentManager] Loading doc ${docId} into memory...`);
      lock = loadDocumentFromDB(docId).then(ydoc => {
        const newState: DocumentState = {
          doc: ydoc,
          connections: new Set(),
          pendingUpdates: [],
          updateCount: 0,
          lastSnapshotTime: Date.now(),
          timeoutId: null,
        };
        activeDocuments.set(docId, newState);
        loadingLocks.delete(docId);
        return ydoc;
      }).catch(err => {
        loadingLocks.delete(docId);
        throw err;
      });
      loadingLocks.set(docId, lock);
    }
    await lock;
    state = activeDocuments.get(docId)!;
  }

  // Attach connection
  state.connections.add(ws);
  console.log(`[DocumentManager] Client joined doc ${docId}. Active connections: ${state.connections.size}`);

  return state.doc;
}

/**
 * Handles an incoming Yjs update from a specific client.
 * Broadcasts the update to all other connected clients and schedules a DB flush.
 */
export function handleUpdate(docId: string, update: Uint8Array, senderWs: WebSocket) {
  const state = activeDocuments.get(docId);
  if (!state) return;

  // 1. Apply update to the in-memory Y.Doc safely
  try {
    Y.applyUpdate(state.doc, update);
  } catch (err) {
    console.error(`[DocumentManager] Safely discarded malformed Yjs update`, err);
    return;
  }

  // 2. Broadcast to other connected clients safely excluding sender
  state.connections.forEach((clientWs) => {
    if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(update);
    }
  });

  // 3. Queue for persistence
  state.pendingUpdates.push(update);
  state.updateCount++;

  // 4. Handle Backpressure: limit buffer growth
  const MAX_BUFFER_SIZE = 50;
  if (state.pendingUpdates.length >= MAX_BUFFER_SIZE) {
    const mergedObj = Y.mergeUpdates(state.pendingUpdates); 
    state.pendingUpdates = [mergedObj];
  }

  // 5. One Timer Rule: Only initiate if missing
  if (!state.timeoutId) {
    state.timeoutId = setTimeout(() => {
      flushBatchedUpdates(docId);
    }, UPDATE_BATCH_TIMEOUT);
  }
}

/**
 * Explicitly removes a client connection.
 * If no clients remain, initiates the final cleanup strategy.
 */
export async function leaveDocument(docId: string, ws: WebSocket) {
  const state = activeDocuments.get(docId);
  if (!state) return;

  state.connections.delete(ws);
  console.log(`[DocumentManager] Client left doc ${docId}. Active connections: ${state.connections.size}`);

  // Cleanup Strategy: No users connected
  if (state.connections.size === 0) {
    console.log(`[DocumentManager] No connections left for doc ${docId}. Initiating cleanup...`);
    
    // Clear batch timeout
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }

    try {
      // 1. Flush any pending updates immediately
      if (state.pendingUpdates.length > 0) {
        const mergedUpdate = Y.mergeUpdates(state.pendingUpdates);
        await persistBatchedUpdate(docId, mergedUpdate);
      }

      // 2. Create a final snapshot of the full document
      await createSnapshot(docId, state.doc);

      // 3. Remove from memory to prevent leaks
      state.doc.destroy();
      activeDocuments.delete(docId);
      console.log(`[DocumentManager] Successfully cleaned up doc ${docId} from memory.`);

    } catch (err) {
      console.error(`[DocumentManager] Error during cleanup for doc ${docId}:`, err);
    }
  }
}

/**
 * Flushes pending updates to the DB and checks if a snapshot is needed during active editing.
 */
async function flushBatchedUpdates(docId: string, retryDelayMS: number = UPDATE_BATCH_TIMEOUT) {
  const state = activeDocuments.get(docId);
  if (!state || state.pendingUpdates.length === 0) {
    if (state) state.timeoutId = null;
    return;
  }

  const updatesToSave = state.pendingUpdates;
  state.pendingUpdates = [];

  try {
    const mergedUpdate = Y.mergeUpdates(updatesToSave);
    await persistBatchedUpdate(docId, mergedUpdate);

    // Snapshot thresholds
    const now = Date.now();
    if (
      state.updateCount >= SNAPSHOT_UPDATE_COUNT_THRESHOLD ||
      (now - state.lastSnapshotTime) >= SNAPSHOT_TIME_THRESHOLD
    ) {
      await createSnapshot(docId, state.doc);
      state.updateCount = 0;
      state.lastSnapshotTime = now;
    }
    
    // Timer Bug Fix: Clear the timeout lock only *after* successfully completing
    state.timeoutId = null;
    
    // If updates arrived while blocked by IO, begin the next isolated timer
    if (state.pendingUpdates.length > 0) {
      state.timeoutId = setTimeout(() => flushBatchedUpdates(docId), UPDATE_BATCH_TIMEOUT);
    }
  } catch (err) {
    console.error(`[DocumentManager] DB failure. Retrying...`, err);
    
    // Failure Handling: Restore missing updates back into memory
    state.pendingUpdates.unshift(...updatesToSave);
    
    // Schedule restart timer via exponential backoff (Max limit 60s)
    const nextRetry = Math.min(retryDelayMS * 2, 60000);
    state.timeoutId = setTimeout(() => flushBatchedUpdates(docId, nextRetry), nextRetry);
  }
}
