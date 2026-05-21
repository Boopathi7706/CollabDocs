import crypto from 'crypto';
import { pool, query } from '../config/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccessResult {
  canAccess: boolean;
  permission?: 'owner' | 'editor' | 'viewer';
  allowEditorSharing?: boolean;
  pendingRequest?: boolean;
}

export interface SharedDocument {
  id: string;
  title: string;
  createdAt: string;
  permission: string;
}

// ─── shareDocument ─────────────────────────────────────────────────────────────
// Verifies ownership or editor access with allow_editor_sharing enabled.
// Generates link-based invitation token (not preselected for any recipient).

export async function shareDocument(
  docId: string,
  callerId: string,
  permission: 'viewer' | 'editor'
): Promise<{ token: string }> {
  // 1. Resolve caller role on document
  const callerAccess = await checkDocumentAccess(docId, callerId);
  if (!callerAccess.canAccess) {
    throw new Error('FORBIDDEN');
  }

  const callerRole = callerAccess.permission;

  // 2. Validate permission rules
  if (callerRole === 'viewer') {
    throw new Error('FORBIDDEN');
  }

  if (callerRole === 'editor') {
    // Editors can only share if allow_editor_sharing is enabled on the document
    const docCheck = await query(
      `SELECT allow_editor_sharing FROM documents WHERE id = $1`,
      [docId]
    );
    if (docCheck.rows.length === 0) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }
    if (!docCheck.rows[0].allow_editor_sharing) {
      throw new Error('EDITOR_SHARING_DISABLED');
    }

    // Editors can only generate viewer invites
    if (permission === 'editor') {
      throw new Error('CANNOT_ESCALATE_PERMISSION');
    }
  }

  // 3. Generate a secure link-based token
  const token = crypto.randomBytes(32).toString('hex');

  // 4. Insert invite row — invite_type default is 'anyone'
  await query(
    `INSERT INTO document_invites
       (document_id, created_by, target_user_id, permission, invite_type, token, expires_at)
     VALUES ($1, $2, NULL, $3, 'anyone', $4, NOW() + INTERVAL '7 days')`,
    [docId, callerId, permission, token]
  );

  console.log('[Invite] Link Generated', {
    docId,
    permission,
    token: token.slice(0, 8) + '...',
  });

  return {
    token,
  };
}

// ─── checkDocumentAccess ───────────────────────────────────────────────────────
// Retrieves resolved role plus policy flags and pending request status in one trip.

export async function checkDocumentAccess(
  docId: string,
  userId: string
): Promise<AccessResult> {
  const res = await query(
    `SELECT
       CASE
         WHEN d.owner_id = $2 THEN 'owner'
         ELSE dm.role
       END AS permission,
       TRUE AS "canAccess",
       d.allow_editor_sharing AS "allowEditorSharing"
     FROM documents d
     LEFT JOIN document_members dm
       ON dm.doc_id = $1 AND dm.user_id = $2
     WHERE d.id = $1
       AND (
         d.owner_id = $2
         OR EXISTS (
           SELECT 1 FROM document_members
           WHERE doc_id = $1 AND user_id = $2
         )
       )
     LIMIT 1`,
    [docId, userId]
  );

  if (res.rows.length === 0) {
    // If not a member, check if there is a pending request to show state
    const pendingCheck = await query(
      `SELECT 1 FROM document_access_requests 
       WHERE document_id = $1 AND requested_by = $2 AND status = 'pending'
       LIMIT 1`,
      [docId, userId]
    );
    const pendingRequest = pendingCheck.rows.length > 0;
    return { canAccess: false, pendingRequest };
  }

  const permission = res.rows[0].permission as 'owner' | 'editor' | 'viewer';
  const allowEditorSharing = res.rows[0].allowEditorSharing;

  const pendingCheck = await query(
    `SELECT 1 FROM document_access_requests 
     WHERE document_id = $1 AND requested_by = $2 AND status = 'pending'
     LIMIT 1`,
    [docId, userId]
  );
  const pendingRequest = pendingCheck.rows.length > 0;

  return {
    canAccess: true,
    permission,
    allowEditorSharing,
    pendingRequest,
  };
}

// ─── getSharedDocuments ────────────────────────────────────────────────────────
// Returns docs shared with the user — excludes owned docs.

export async function getSharedDocuments(userId: string): Promise<SharedDocument[]> {
  const res = await query(
    `SELECT
       d.id,
       d.title,
       d.created_at AS "createdAt",
       dm.role      AS permission
     FROM document_members dm
     JOIN documents d ON d.id = dm.doc_id
     WHERE dm.user_id = $1
       AND dm.role != 'owner'
     ORDER BY d.created_at DESC`,
    [userId]
  );
  return res.rows;
}

// ─── redeemInviteToken ────────────────────────────────────────────────────────
// Redeems invite token for any authenticated user.

export async function redeemInviteToken(
  token: string,
  docId: string,
  userId: string
): Promise<{ permission: 'viewer' | 'editor' }> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock the invite row exclusively
    const inviteRes = await client.query(
      `SELECT * FROM document_invites WHERE token = $1 FOR UPDATE`,
      [token]
    );

    // 2. Validate
    if (inviteRes.rows.length === 0) {
      throw new Error('INVITE_NOT_FOUND');
    }

    const invite = inviteRes.rows[0];

    if (invite.used) {
      throw new Error('INVITE_ALREADY_USED');
    }

    if (new Date(invite.expires_at) < new Date()) {
      console.warn('[Invite] Expired', {
        token: token.slice(0, 8) + '...',
        docId,
      });
      throw new Error('INVITE_EXPIRED');
    }

    if (invite.document_id !== docId) {
      console.warn('[Invite] Rejected', { reason: 'doc_id_mismatch', docId });
      throw new Error('INVITE_DOC_MISMATCH');
    }

    // 3. Enroll user — ON CONFLICT DO NOTHING (idempotent, preserve existing role if higher)
    await client.query(
      `INSERT INTO document_members (doc_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (doc_id, user_id) DO NOTHING`,
      [docId, userId, invite.permission]
    );

    // 4. Mark invite consumed
    await client.query(
      `UPDATE document_invites SET used = TRUE WHERE token = $1`,
      [token]
    );

    await client.query('COMMIT');

    console.log('[Invite] Redeemed', { userId, docId });

    return { permission: invite.permission as 'viewer' | 'editor' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── requestAccess ────────────────────────────────────────────────────────────
// Requests edit access for a viewer. Throws if already editor/owner or already pending.

export async function requestAccess(docId: string, userId: string): Promise<string> {
  // 1. Check if user is already owner or editor
  const access = await checkDocumentAccess(docId, userId);
  if (access.canAccess && (access.permission === 'owner' || access.permission === 'editor')) {
    throw new Error('ALREADY_MEMBER');
  }

  // 2. Check for duplicate pending requests
  const pendingRes = await query(
    `SELECT 1 FROM document_access_requests 
     WHERE document_id = $1 AND requested_by = $2 AND status = 'pending'`,
    [docId, userId]
  );
  if (pendingRes.rows.length > 0) {
    throw new Error('ALREADY_PENDING');
  }

  // 3. Insert pending request
  await query(
    `INSERT INTO document_access_requests (document_id, requested_by, status)
     VALUES ($1, $2, 'pending')`,
    [docId, userId]
  );

  return 'REQUEST_CREATED';
}

// ─── getAccessRequests ────────────────────────────────────────────────────────
// Gets all pending requests for documents owned by caller.

export async function getAccessRequests(ownerId: string): Promise<any[]> {
  const res = await query(
    `SELECT 
       ar.id,
       ar.document_id AS "documentId",
       ar.requested_by AS "requestedBy",
       ar.status,
       ar.created_at AS "createdAt",
       d.title AS "documentTitle",
       u.email AS "userEmail",
       u.name AS "userName"
     FROM document_access_requests ar
     JOIN documents d ON d.id = ar.document_id
     JOIN users u ON u.id = ar.requested_by
     WHERE d.owner_id = $1 AND ar.status = 'pending'
     ORDER BY ar.created_at DESC`,
    [ownerId]
  );
  return res.rows;
}

// ─── approveAccessRequest ──────────────────────────────────────────────────────
// Approves request: transitions request status to approved, rejects duplicates, and sets role to editor.

export async function approveAccessRequest(
  docId: string,
  ownerId: string,
  requestId: string,
  userId: string
): Promise<void> {
  const ownerCheck = await query(
    `SELECT 1 FROM documents WHERE id = $1 AND owner_id = $2`,
    [docId, ownerId]
  );
  if (ownerCheck.rows.length === 0) {
    throw new Error('DOCUMENT_NOT_OWNED');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Approve this request
    await client.query(
      `UPDATE document_access_requests 
       SET status = 'approved' 
       WHERE id = $1`,
      [requestId]
    );

    // 2. Reject other duplicate pending requests for this user/doc
    await client.query(
      `UPDATE document_access_requests 
       SET status = 'rejected' 
       WHERE document_id = $1 AND requested_by = $2 AND id != $3 AND status = 'pending'`,
      [docId, userId, requestId]
    );

    // 3. Upsert into document_members as editor
    await client.query(
      `INSERT INTO document_members (doc_id, user_id, role)
       VALUES ($1, $2, 'editor')
       ON CONFLICT (doc_id, user_id) DO UPDATE SET role = 'editor'`,
      [docId, userId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── rejectAccessRequest ───────────────────────────────────────────────────────

export async function rejectAccessRequest(
  docId: string,
  ownerId: string,
  requestId: string
): Promise<void> {
  const ownerCheck = await query(
    `SELECT 1 FROM documents WHERE id = $1 AND owner_id = $2`,
    [docId, ownerId]
  );
  if (ownerCheck.rows.length === 0) {
    throw new Error('DOCUMENT_NOT_OWNED');
  }

  await query(
    `UPDATE document_access_requests 
     SET status = 'rejected' 
     WHERE id = $1`,
    [requestId]
  );
}

// ─── toggleEditorSharing ───────────────────────────────────────────────────────

export async function toggleEditorSharing(
  docId: string,
  ownerId: string,
  allow: boolean
): Promise<void> {
  const ownerCheck = await query(
    `SELECT 1 FROM documents WHERE id = $1 AND owner_id = $2`,
    [docId, ownerId]
  );
  if (ownerCheck.rows.length === 0) {
    throw new Error('DOCUMENT_NOT_OWNED');
  }

  await query(
    `UPDATE documents SET allow_editor_sharing = $2 WHERE id = $1`,
    [docId, allow]
  );
}
