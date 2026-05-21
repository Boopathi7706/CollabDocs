import { Router } from "express";
import * as DocumentController from "../controllers/documentController";
import * as ShareController from "../controllers/shareController";
import { authMiddleware } from "../middleware/authMiddleware";
import { documentAccessMiddleware } from "../middleware/documentAccessMiddleware";

const router = Router();

// Protect all document routes natively bypassing unauthenticated calls
router.use(authMiddleware);

// Shared with me - MUST be before /:id routes
router.get("/shared-with-me", ShareController.getSharedWithMe);
router.get("/access-requests", ShareController.getAccessRequests);

router.post("/", DocumentController.createDocument);
router.get("/", DocumentController.getDocuments);

// Sharing management & invitation endpoints
router.post("/:id/share", ShareController.shareDocument);
router.get("/:id/access", ShareController.checkAccess);
router.post("/:id/redeem", ShareController.redeemInvite);
router.post("/:id/request-access", ShareController.requestAccess);
router.post("/:id/approve-request", ShareController.approveAccessRequest);
router.post("/:id/reject-request", ShareController.rejectAccessRequest);
router.post("/:id/toggle-editor-sharing", ShareController.toggleEditorSharing);

// Optional hook dynamically to find individual docs (access protected)
router.get("/:id", documentAccessMiddleware, DocumentController.getDocumentById);
router.patch("/:id", documentAccessMiddleware, DocumentController.updateDocument);
router.delete("/:id", DocumentController.deleteDocument);

export default router;

