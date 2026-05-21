import { Request, Response, NextFunction } from 'express';
import { checkDocumentAccess } from '../services/shareService';

export async function documentAccessMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const docId = req.params.id as string;
    const userId = req.user?.id;

    if (!docId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { canAccess, permission } = await checkDocumentAccess(docId, userId);

    if (!canAccess) {
      return res.status(403).json({ error: 'Access Denied: You do not have permission to access this document' });
    }

    // Attach resolved permission to request for use in controllers if needed
    (req as any).documentPermission = permission;

    next();
  } catch (err) {
    console.error(`[DocumentAccessMiddleware] Error checking access for doc ${req.params.id}:`, err);
    res.status(500).json({ error: 'Failed to authorize document access' });
  }
}
