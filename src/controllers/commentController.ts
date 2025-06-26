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

async function fetchIssueDetails(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<{ labels: { name: string }[] }> {
  const token = process.env.GITHUB_COMMENT_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `GitHub API error fetching issue: ${resp.status} ${resp.statusText} — ${text}`
    );
  }
  return (await resp.json()) as any;
}
export const commentOnPrs: RequestHandler = async (req, res) => {
  console.log("📥 Incoming PR payload:", JSON.stringify(req.body, null, 2));

  const { owner, repo, prNumber, author, description = "", labels = [] } = req.body as {
    owner?: string;
    repo?: string;
    prNumber?: number;
    author?: string;
    description?: string;
    labels?: string[];
  };

  if (!owner || !repo || !prNumber || !author) {
    res
      .status(400)
      .json({ error: "owner, repo, prNumber and author are required" });
    return;
  }

  /* ── 1.  Extract stake from PR labels (fallback) ─────────────── */
  const stakeFromPR = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
  let stakeAmt = stakeFromPR ? Number(stakeFromPR.match(/(\d+)/)![1]) : 0;

  /* ── 2.  Look for “#123” in PR body and fetch that issue’s labels ─ */
  const issueMatch = description.match(/#(\d+)/);
  let issueRef = "no linked issue";

  if (issueMatch) {
    const linkedIssueNumber = Number(issueMatch[1]);
    issueRef = `#${linkedIssueNumber}`;

    try {
      const issueData = await fetchIssueDetails(owner, repo, linkedIssueNumber);
      const stakeLabel = issueData.labels
        .map(l => l.name)
        .find(n => /^stake[-:\s]?(\d+)$/i.test(n));

      if (stakeLabel) {
        stakeAmt = Number(stakeLabel.match(/(\d+)/)![1]);
      }
    } catch (e) {
      console.error("⚠️  Could not fetch linked issue:", e);
      // keep stakeAmt as-is; continue
    }
  }

  /* ── 3.  Build and post comment ───────────────────────────────── */
  const commentBody = `🎉  Thanks for opening this pull request, @${author}!

• Linked issue: **${issueRef}**
• 🪙 **Stake deducted:** ${stakeAmt} coins.`;

  try {
    const comment = await postIssueComment(owner, repo, prNumber, commentBody);
    res.status(201).json({ html_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post PR comment:", err);
    res
      .status(502)
      .json({ error: err.message ?? "GitHub request failed" });
  }
};