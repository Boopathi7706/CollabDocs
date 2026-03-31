import { v4 as uuid } from "uuid";
import { query } from "../config/db";

export async function createDocument(title: string, ownerId: string) {
  const id = uuid();
  const res = await query(
    `INSERT INTO documents (id, title, owner_id)
     VALUES ($1, $2, $3)
     RETURNING id, title, created_at AS "createdAt"`,
    [id, title, ownerId]
  );
  return res.rows[0];
}

export async function getDocuments(ownerId: string) {
  const res = await query(
    `SELECT id, title, created_at AS "createdAt"
     FROM documents
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [ownerId]
  );
  return res.rows;
}

export async function getDocumentById(id: string) {
  const res = await query(
    `SELECT id, title, created_at AS "createdAt"
     FROM documents
     WHERE id = $1`,
    [id]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function updateDocument(id: string, title: string, ownerId: string) {
  const res = await query(
    `UPDATE documents
     SET title = $2, updated_at = NOW()
     WHERE id = $1 AND owner_id = $3
     RETURNING id, title, created_at AS "createdAt"`,
    [id, title, ownerId]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function deleteDocument(id: string, ownerId: string) {
  await query(
    `DELETE FROM documents
     WHERE id = $1 AND owner_id = $2`,
    [id, ownerId]
  );
  return { id };
}
