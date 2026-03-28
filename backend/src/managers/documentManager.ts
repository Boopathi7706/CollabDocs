import { WebSocket } from 'ws';
import * as Y from 'yjs';
import { loadDocumentFromDB } from '../services/documentLoader';
import { persistBatchedUpdate, createSnapshot } from '../services/dbPersistence';

const UPDATE_BATCH_TIMEOUT = 3000;
const SNAPSHOT_UPDATE_COUNT_THRESHOLD = 50;
const SNAPSHOT_TIME_THRESHOLD = 60000;

interface PendingUpdates {
  updates: Uint8Array[];
  failures: number;
  nextRetry: number;
}

const retryQueue = new Map<string, PendingUpdates>();

// Independent Background Retry Worker
setInterval(async () => {
  const now = Date.now();
  for (const [docId, pending] of retryQueue.entries()) {
    if (now < pending.nextRetry) continue;

    try {
      if (pending.updates.length > 0) {
        const mergedUpdate = Y.mergeUpdates(pending.updates);
        await persistBatchedUpdate(docId, mergedUpdate);
      }
      
      // Success
      retryQueue.delete(docId);
      console.log(`[RetryWorker] Successfully recovered and persisted doc ${docId}`);

      const state = activeDocuments.get(docId);
      if (state && state.status === 'closing' && state.connections.size === 0) {
        // Safe Cleanup
        try {
          await createSnapshot(docId, state.doc);
        } catch (snapErr) {
          console.error(`[RetryWorker] Snapshot failed during cleanup for doc ${docId}`, snapErr);
        }
        state.doc.destroy();
        activeDocuments.delete(docId);
        console.log(`[RetryWorker] Successfully cleaned up doc ${docId}`);
      }
    } catch (err) {
      pending.failures++;
      const backoff = Math.min(5000 * Math.pow(2, pending.failures), 60000);
      pending.nextRetry = now + backoff;
      console.error(`[RetryWorker] Retry failed for doc ${docId}. Next retry in ${backoff}ms`);
    }
  }
}, 5000);

interface DocumentState {
  doc: Y.Doc;
  connections: Set<WebSocket>;
  pendingUpdates: Uint8Array[];
  updateCount: number;
  lastSnapshotTime: number;
  timeoutId: NodeJS.Timeout | null;
  status: "active" | "closing";
}

// In-Memory map of active documents being edited
const activeDocuments = new Map<string, DocumentState>();
const loadingLocks = new Map<string, Promise<Y.Doc>>();
const closingLocks = new Map<string, Promise<void>>();

/**
 * Ensures the document is loaded into memory and attaches the user connection.
 */
export async function joinDocument(docId: string, ws: WebSocket): Promise<Y.Doc> {
  // Await any in-progress cleanup before trying to read from activeDocuments
  while (closingLocks.has(docId)) {
    console.log(`[DocumentManager] Doc ${docId} is closing. Waiting for cleanup to finish before joining...`);
    await closingLocks.get(docId);
  }

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
          status: "active",
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

  // Cleanup Strategy: No users connected AND not already closing
  if (state.connections.size === 0 && state.status === 'active') {
    state.status = 'closing';
    
    // Clear batch timeout
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }

    // Passively lock all future rejoins
    let cleanupResolver: () => void;
    const cleanupPromise = new Promise<void>((resolve) => { cleanupResolver = resolve; });
    closingLocks.set(docId, cleanupPromise);

    try {
      // Combine state updates and existing retry queue
      const pendingRetries = retryQueue.get(docId)?.updates || [];
      const updatesToSave = [...pendingRetries, ...state.pendingUpdates];
      state.pendingUpdates = [];

      // 1. Flush any pending updates immediately
      if (updatesToSave.length > 0) {
        try {
          const mergedUpdate = Y.mergeUpdates(updatesToSave);
          await persistBatchedUpdate(docId, mergedUpdate);
          retryQueue.delete(docId);
        } catch (dbErr) {
          console.error(`[DocumentManager] DB failure during cleanup for doc ${docId}. Saving to retry queue.`, dbErr);
          
          let pending = retryQueue.get(docId);
          if (!pending) {
            pending = { updates: [], failures: 0, nextRetry: Date.now() + 5000 };
            retryQueue.set(docId, pending);
          }
          pending.updates = updatesToSave;
        }
      }

      // 2. Only cleanup if persistence succeeded (nothing in retry queue)
      if (!retryQueue.has(docId)) {
        await createSnapshot(docId, state.doc);
        state.doc.destroy();
        activeDocuments.delete(docId);
        console.log(`[DocumentManager] Successfully cleaned up doc ${docId}`);
      } else {
        console.log(`[DocumentManager] Cleanup for doc ${docId} deferred to RetryWorker.`);
      }

    } catch (err) {
      console.error(`[DocumentManager] Error during cleanup for doc ${docId}:`, err);
    } finally {
      // Release the lock, allowing waiting joiners to proceed
      closingLocks.delete(docId);
      cleanupResolver!(); 
    }
  }
}

/**
 * Flushes pending updates to the DB and checks if a snapshot is needed during active editing.
 */
async function flushBatchedUpdates(docId: string) {
  const state = activeDocuments.get(docId);
  if (!state) return;

  const pendingRetries = retryQueue.get(docId)?.updates || [];
  
  if (state.pendingUpdates.length === 0 && pendingRetries.length === 0) {
    state.timeoutId = null;
    return;
  }

  const updatesToSave = [...pendingRetries, ...state.pendingUpdates];
  state.pendingUpdates = [];

  try {
    const mergedUpdate = Y.mergeUpdates(updatesToSave);
    await persistBatchedUpdate(docId, mergedUpdate);
    retryQueue.delete(docId);

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
    console.error(`[DocumentManager] DB failure. Moving to retry queue...`, err);
    
    // Failure Handling: Store in retry queue
    let pending = retryQueue.get(docId);
    if (!pending) {
      pending = { updates: [], failures: 0, nextRetry: Date.now() + 5000 };
      retryQueue.set(docId, pending);
    }
    pending.updates = updatesToSave; 
    
    // Let RetryWorker handle it. Don't resume lock timer so we don't spam.
    state.timeoutId = null;
  }
}
