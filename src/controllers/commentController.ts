// src/controllers/commentController.ts
import { Request, Response, RequestHandler } from "express";
import { postIssueComment } from "../utils/githubComment";

export const commentOnIssue: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));

  const { owner, repo, issueNumber, labels } = req.body as {
    owner: string;
    repo: string;
    issueNumber: number;
    labels?: string[];
  };

  if (!owner || !repo || !issueNumber) {
     res.status(400).json({
      error: "owner, repo and issueNumber are required",
    });
  }

  const labelList = (labels ?? []).join(", ") || "none";
  const commentBody = `🎉  Thanks for opening this!\n_Labels_: ${labelList}`;

  try {
    const comment = await postIssueComment(owner, repo, issueNumber, commentBody);
     res.status(201).json({ html_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post comment:", err);
     res.status(502).json({ error: err.message ?? "GitHub request failed" });
  }
};
