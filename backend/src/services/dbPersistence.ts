import * as Y from 'yjs';
import { query } from '../config/db';

/**
 * Saves a batched Yjs update (Uint8Array) to the database.
 */
export async function persistBatchedUpdate(docId: string, batchedUpdate: Uint8Array): Promise<void> {
  try {
    await query(
      `INSERT INTO document_updates (doc_id, update_blob) 
       SELECT $1, $2 
       WHERE NOT EXISTS (
         SELECT 1 FROM document_updates WHERE doc_id = $1 AND update_blob = $2
       )`,
      [docId, Buffer.from(batchedUpdate)]
    );
    console.log(`[DBPersistence] Saved batched update for doc ${docId}`);
  } catch (error) {
    console.error(`[DBPersistence] Error persisting update for doc ${docId}:`, error);
    throw error;
  }
}

/**
 * Creates a complete snapshot of the document state and compacts old updates.
 * This stores the full document state (Y.encodeStateAsUpdate), NOT simply the state vector.
 */
export async function createSnapshot(docId: string, ydoc: Y.Doc): Promise<void> {
  try {
    // encodeStateAsUpdate(doc) encodes the ENTIRE document state into a single update
    const snapshotState = Y.encodeStateAsUpdate(ydoc);
    
    await query('BEGIN'); 

    // Get current max version
    const versionRes = await query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next_version 
       FROM document_snapshots WHERE doc_id = $1`,
      [docId]
    );
    const nextVersion = versionRes.rows[0].next_version;

    const snapshotTime = new Date();

    // Insert new snapshot
    await query(
      `INSERT INTO document_snapshots (doc_id, snapshot_blob, version, created_at) VALUES ($1, $2, $3, $4)`,
      [docId, Buffer.from(snapshotState), nextVersion, snapshotTime]
    );

    // Delete all incremental updates that are now incorporated into this snapshot
    await query(
      "DELETE FROM document_updates WHERE doc_id = $1 AND created_at <= $2",
      [docId, snapshotTime]
    );

    await query('COMMIT'); 
    console.log(`[DBPersistence] Created snapshot v${nextVersion} for doc ${docId}`);

  } catch (error) {
    await query('ROLLBACK');
    console.error(`[DBPersistence] Error creating snapshot for doc ${docId}:`, error);
    throw error;
  }
}
