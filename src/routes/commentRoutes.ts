import { Router } from "express";
import { commentOnIssue } from "../controllers/commentController";

const router = Router();

// Make sure the route path and method are correct
router.post("/issues", commentOnIssue);

export default router;