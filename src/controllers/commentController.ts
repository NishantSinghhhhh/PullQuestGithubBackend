// src/controllers/commentController.ts
import { Request, Response, RequestHandler } from "express";
import { postIssueComment } from "../utils/githubComment";

export const commentOnIssue: RequestHandler = async (req, res) => {
  console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));

  const {
    owner,       // "PullQuest-Test"
    repo,        // "backend"
    issueNumber, // 6
    labels = []  // ["stake-30","question",…]
  }: {
    owner?: string;
    repo?: string;
    issueNumber?: number;
    labels?: string[];
  } = req.body;

  if (!owner || !repo || !issueNumber) {
    res.status(400).json({ error: "owner, repo and issueNumber are required" });
    return;
  }

  // look for "stake-<N>"
  const stakeLabel = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
  const stakeAmt   = stakeLabel ? Number(stakeLabel.match(/(\d+)/)![1]) : null;

  const commentBody = stakeAmt
    ? `🎉  Thanks for opening this issue!\n\n🪙 **Stake required:** ${stakeAmt} coins.\n\nAnyone who submits a PR must first stake **${stakeAmt}** coins from their balance.`
    : `🎉  Thanks for opening this issue!`;

  try {
    const comment = await postIssueComment(owner, repo, issueNumber, commentBody);
    res.status(201).json({ html_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub request failed" });
  }
};
export const commentOnPrs: RequestHandler = async (req, res) => {
  /*── 1.  Log full payload for debugging ─────────────────────────────*/
  console.log("📥 Incoming PR payload:", JSON.stringify(req.body, null, 2));

  /*── 2.  Destructure the expected fields ────────────────────────────*/
  const {
    owner,          // "PullQuest-Test"
    repo,           // "backend"
    prNumber,       // 12
    author,         // "NishantSinghhhhh"
    description = "",   // PR body text
    labels = []     // ["stake-30", …]
  }: {
    owner?: string;
    repo?: string;
    prNumber?: number;
    author?: string;
    description?: string;
    labels?: string[];
  } = req.body;

  if (!owner || !repo || !prNumber || !author) {
    res.status(400).json({ error: "owner, repo, prNumber and author are required" });
    return;
  }

  const stakeLabel = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
  const stakeAmt   = stakeLabel ? Number(stakeLabel.match(/(\d+)/)![1]) : 0;


  const issueMatch = description.match(/#(\d+)/);
  const issueRef   = issueMatch ? `#${issueMatch[1]}` : "no linked issue";

  const commentBody = `🎉  Thanks for opening this pull request, @${author}!

• Linked issue: **${issueRef}**
• 🪙 **Stake deducted:** ${stakeAmt} coins.`;

  try {
    const comment = await postIssueComment(owner, repo, prNumber, commentBody);
    res.status(201).json({ html_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post PR comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub request failed" });
  }
};