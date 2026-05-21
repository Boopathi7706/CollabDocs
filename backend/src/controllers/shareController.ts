import { Request, Response } from 'express';
import * as ShareService from '../services/shareService';

export async function shareDocument(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const callerId = req.user.id;
    const { permission } = req.body;

    if (permission !== 'viewer' && permission !== 'editor') {
      return res.status(400).json({ error: 'Invalid permission. Must be viewer or editor' });
    }

    const result = await ShareService.shareDocument(docId, callerId, permission);
    res.status(200).json(result);
  } catch (err: any) {
    console.error(`[ShareController] Error sharing document:`, err);
    const msg = err.message;
    if (msg === 'FORBIDDEN' || msg === 'DOCUMENT_NOT_OWNED' || msg === 'EDITOR_SHARING_DISABLED' || msg === 'CANNOT_ESCALATE_PERMISSION') {
      return res.status(403).json({ error: 'You do not have permission to share this document or generate this permission level' });
    }
    if (msg === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(500).json({ error: 'Failed to share document' });
  }
}

export async function checkAccess(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const userId = req.user.id;
    const access = await ShareService.checkDocumentAccess(docId, userId);
    res.status(200).json(access);
  } catch (err: any) {
    console.error(`[ShareController] Error checking document access:`, err);
    res.status(500).json({ error: 'Failed to check document access' });
  }
}

export async function redeemInvite(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const userId = req.user.id;
    
    const token = req.body.token || req.body.invite || req.query.token || req.query.invite;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invite token is required' });
    }

    const { permission } = await ShareService.redeemInviteToken(token, docId, userId);
    res.status(200).json({ canAccess: true, permission });
  } catch (err: any) {
    console.error(`[ShareController] Error redeeming invite:`, err);
    const msg = err.message;
    if (msg === 'INVITE_NOT_FOUND') {
      return res.status(404).json({ error: 'Invite token not found' });
    }
    if (msg === 'INVITE_ALREADY_USED') {
      return res.status(409).json({ error: 'Invite token has already been used' });
    }
    if (msg === 'INVITE_EXPIRED') {
      return res.status(410).json({ error: 'Invite token has expired' });
    }
    if (msg === 'INVITE_DOC_MISMATCH') {
      return res.status(403).json({ error: 'Invite token is for a different document' });
    }
    res.status(500).json({ error: 'Failed to redeem invite token' });
  }
}

export async function getSharedWithMe(req: Request, res: Response) {
  try {
    const userId = req.user.id;
    const docs = await ShareService.getSharedDocuments(userId);
    res.status(200).json(docs);
  } catch (err: any) {
    console.error(`[ShareController] Error fetching shared documents:`, err);
    res.status(500).json({ error: 'Failed to fetch shared documents' });
  }
}

// ─── Request Access Controllers ───────────────────────────────────────────────

export async function requestAccess(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const userId = req.user.id;

    const result = await ShareService.requestAccess(docId, userId);
    res.status(201).json({ status: result });
  } catch (err: any) {
    console.error(`[ShareController] Error requesting access:`, err);
    const msg = err.message;
    if (msg === 'ALREADY_PENDING') {
      return res.status(409).json({ error: 'already_pending' });
    }
    if (msg === 'ALREADY_MEMBER') {
      return res.status(400).json({ error: 'already_member' });
    }
    res.status(500).json({ error: 'Failed to request access' });
  }
}

export async function getAccessRequests(req: Request, res: Response) {
  try {
    const ownerId = req.user.id;
    const requests = await ShareService.getAccessRequests(ownerId);
    res.status(200).json(requests);
  } catch (err: any) {
    console.error(`[ShareController] Error getting access requests:`, err);
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
}

export async function approveAccessRequest(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const ownerId = req.user.id;
    const { requestId, userId } = req.body;

    if (!requestId || !userId) {
      return res.status(400).json({ error: 'requestId and userId are required' });
    }

    await ShareService.approveAccessRequest(docId, ownerId, requestId, userId);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(`[ShareController] Error approving access request:`, err);
    if (err.message === 'DOCUMENT_NOT_OWNED') {
      return res.status(403).json({ error: 'You do not own this document' });
    }
    res.status(500).json({ error: 'Failed to approve access request' });
  }
}

export async function rejectAccessRequest(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const ownerId = req.user.id;
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'requestId is required' });
    }

    await ShareService.rejectAccessRequest(docId, ownerId, requestId);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(`[ShareController] Error rejecting access request:`, err);
    if (err.message === 'DOCUMENT_NOT_OWNED') {
      return res.status(403).json({ error: 'You do not own this document' });
    }
    res.status(500).json({ error: 'Failed to reject access request' });
  }
}

export async function toggleEditorSharing(req: Request, res: Response) {
  try {
    const docId = req.params.id as string;
    const ownerId = req.user.id;
    const { allowEditorSharing } = req.body;

    if (allowEditorSharing === undefined) {
      return res.status(400).json({ error: 'allowEditorSharing boolean is required' });
    }

    await ShareService.toggleEditorSharing(docId, ownerId, allowEditorSharing);
    res.status(200).json({ success: true });
  } catch (err: any) {
    console.error(`[ShareController] Error toggling editor sharing:`, err);
    if (err.message === 'DOCUMENT_NOT_OWNED') {
      return res.status(403).json({ error: 'You do not own this document' });
    }
    res.status(500).json({ error: 'Failed to toggle editor sharing' });
  }
}
