import { Router } from "express";
import * as DocumentController from "../controllers/documentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Protect all document routes natively bypassing unauthenticated calls
router.use(authMiddleware);

router.post("/", DocumentController.createDocument);
router.get("/", DocumentController.getDocuments);
// Optional hook dynamically to find individual docs
router.get("/:id", DocumentController.getDocumentById);
router.patch("/:id", DocumentController.updateDocument);
router.delete("/:id", DocumentController.deleteDocument);

export default router;
