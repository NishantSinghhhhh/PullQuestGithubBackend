import { Router } from "express";
import { handleCodeReview } from "../controllers/GptController";

const router = Router();

router.post("/code", handleCodeReview);

export default router;