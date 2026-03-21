import * as Y from 'yjs';
import { query } from '../config/db';

/**
 * Loads a Yjs Document from PostgreSQL.
 * 1. Fetches the latest snapshot (full document state).
 * 2. Fetches incremental updates created *after* the snapshot.
 * 3. Applies them to a new Y.Doc.
 */
export async function loadDocumentFromDB(docId: string): Promise<Y.Doc> {
  const ydoc = new Y.Doc();

  try {
    // 1. Fetch latest snapshot (full Y.encodeStateAsUpdate payload)
    const snapshotRes = await query(
      `SELECT snapshot_blob, created_at FROM document_snapshots 
       WHERE doc_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [docId]
    );

    let lastSnapshotTime = new Date(0);

    if (snapshotRes.rows.length > 0) {
      const snapshotBlob = snapshotRes.rows[0].snapshot_blob;
      lastSnapshotTime = snapshotRes.rows[0].created_at;
      Y.applyUpdate(ydoc, snapshotBlob);
      console.log(`[DocumentLoader] Loaded snapshot for doc ${docId}`);
    }

    // 2. Fetch incremental updates since the snapshot
    const updatesRes = await query(
      `SELECT update_blob FROM document_updates 
       WHERE doc_id = $1 AND created_at > $2 ORDER BY created_at ASC`,
      [docId, lastSnapshotTime]
    );

    if (updatesRes.rows.length > 0) {
      console.log(`[DocumentLoader] Applying ${updatesRes.rows.length} updates for doc ${docId}`);
      ydoc.transact(() => {
        // Strict ordering application guarantee
        for (const row of updatesRes.rows) {
          try {
            Y.applyUpdate(ydoc, row.update_blob);
          } catch (err) {
            console.error(`[DocumentLoader] Skipped malformed historical update:`, err);
          }
        }
      });
    }

    return ydoc;
  } catch (error) {
    console.error(`[DocumentLoader] Error loading document ${docId} from DB:`, error);
    // Return empty doc on failure, or throw depending on strictness
    throw error;
  }
}
