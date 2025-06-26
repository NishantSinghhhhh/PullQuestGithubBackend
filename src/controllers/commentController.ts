// src/controllers/commentController.ts
import { Request, Response, RequestHandler } from "express";
import { postIssueComment } from "../utils/githubComment";

export const commentOnIssue: RequestHandler = async (req, res) => {
  console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));

  /* Expected payload shape:
     {
       "repo": "PullQuest-Test/backend",
       "issue_number": 5,
       "labels": ["stake-25", "duplicate", "documentation", "bug"],
       "issue_url": "https://github.com/PullQuest-Test/backend/issues/5"
     }
  */
  const {
    repo,              // "PullQuest-Test/backend"
    issue_number,      // 5
    labels = []        // string[]
  }: {
    repo?: string;
    issue_number?: number;
    labels?: string[];
  } = req.body;

  // 🔸 basic validation
  if (!repo || !issue_number) {
    res.status(400).json({ error: "repo and issue_number are required" });
    return;                                   // ← early exit, no further sends
  }

  // 🔸 split "owner/repoName"
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    res.status(400).json({ error: "repo must be in 'owner/repo' format" });
    return;
  }

  // 🔸 craft comment
  const labelList = labels.length ? labels.join(", ") : "none";
  const commentBody = `🎉  Thanks for opening this!\n_Labels_: ${labelList}`;

  try {
    const comment = await postIssueComment(owner, repoName, issue_number, commentBody);
    res.status(201).json({ html_url: comment.html_url });
    return;
  } catch (err: any) {
    console.error("❌ Failed to post comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub request failed" });
    return;
  }
};
