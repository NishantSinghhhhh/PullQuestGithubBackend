// src/controllers/commentController.ts
import { Request, Response, RequestHandler } from "express";
import { postIssueComment, postPullRequestReviewComment, postPRFormComment } from "../utils/githubComment";

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

export const commentOnPrReview: RequestHandler = async (req, res) => {
  console.log("📥 Incoming PR review payload:", JSON.stringify(req.body, null, 2));

  const {
    owner,
    repo,
    pullNumber,
    commitId,
    path,
    line,
    side,
    body: commentBody
  }: {
    owner?: string;
    repo?: string;
    pullNumber?: number;
    commitId?: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    body?: string;
  } = req.body;

  // Validate required fields
  if (!owner || !repo || !pullNumber || !commitId || !path || !line || !side || !commentBody) {
    res.status(400).json({
      error: "owner, repo, pullNumber, commitId, path, line, side and body are all required"
    });
    return;
  }

  try {
    const reviewComment = await postPullRequestReviewComment(
      owner,
      repo,
      pullNumber,
      commitId,
      path,
      line,
      side,
      commentBody
    );
    // Return the URL of the created review comment
    res.status(201).json({ url: reviewComment.html_url || reviewComment.url });
  } catch (err: any) {
    console.error("❌ Failed to post PR review comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub review-comment request failed" });
  }
};

export const formComment: RequestHandler = async (req, res) => {
  console.log("📥 Incoming XP request payload:", JSON.stringify(req.body, null, 2));
  
  const { owner, repo, prNumber, commenter } = req.body;

  if (!owner || !repo || !prNumber || !commenter) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  console.log(`🎉 Yes! Providing XP form for @${commenter}`);

  const commentBody = `🎉 XP calculation complete for @${commenter}!

  📊 Your contributor XP details:
  • Pull Request: #${prNumber}
  • XP Earned: 150 🪙
  • Total XP: 2,450 🪙
  • Rank: Contributor Level 5

  Keep up the great work! 🚀`;

  try {
    const comment = await postPRFormComment(owner, repo, prNumber, commentBody);
    res.status(201).json({ success: true, comment_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post XP comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub request failed" });
  }
};