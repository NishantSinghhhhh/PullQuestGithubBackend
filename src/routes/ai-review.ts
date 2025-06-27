import { Router } from "express";
import { handleCodeReview } from "../controllers/AiReviewController";

const router = Router();

router.post("/ai-review", handleCodeReview);


export default router;