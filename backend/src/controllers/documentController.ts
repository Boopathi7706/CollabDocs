import { Request, Response } from "express";
import * as DocumentService from "../services/documentService";

export async function createDocument(req: Request, res: Response) {
  try {
    const { title } = req.body;
    const ownerId = req.user.id;
    const docTime = await DocumentService.createDocument(title || "Untitled Document", ownerId);
    console.log(`[Document] Created: ${docTime.id}`);
    res.status(201).json(docTime);
  } catch (err) {
    console.error(`[DocumentController] Error creating document:`, err);
    res.status(500).json({ error: "Failed to create document" });
  }
}

export async function getDocuments(req: Request, res: Response) {
  try {
    const ownerId = req.user.id;
    const documents = await DocumentService.getDocuments(ownerId);
    res.json(documents);
  } catch (err) {
    console.error(`[DocumentController] Error fetching documents:`, err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
}

export async function getDocumentById(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const document = await DocumentService.getDocumentById(id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (err) {
    console.error(`[DocumentController] Error fetching document ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
}

export async function updateDocument(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const { title } = req.body;
    const ownerId = req.user.id;
    const updated = await DocumentService.updateDocument(id, title, ownerId);
    if (!updated) {
      return res.status(404).json({ error: "Document not found" });
    }
    console.log(`[Document] Updated: ${id}`);
    res.json(updated);
  } catch (err) {
    console.error(`[DocumentController] Error updating document ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to update document" });
  }
}

export async function deleteDocument(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const ownerId = req.user.id;
    await DocumentService.deleteDocument(id, ownerId);
    console.log(`[Document] Deleted: ${id}`);
    res.status(204).send();
  } catch (err) {
    console.error(`[DocumentController] Error deleting document ${req.params.id}:`, err);
    res.status(500).json({ error: "Failed to delete document" });
  }
}
