"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formComment = exports.commentOnPrReview = exports.commentOnPrs = exports.commentOnIssue = void 0;
const githubComment_1 = require("../utils/githubComment");
const commentOnIssue = async (req, res) => {
    console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));
    const { owner, // "PullQuest-Test"
    repo, // "backend"
    issueNumber, // 6
    labels = [] // ["stake-30","question",…]
     } = req.body;
    if (!owner || !repo || !issueNumber) {
        res.status(400).json({ error: "owner, repo and issueNumber are required" });
        return;
    }
    // look for "stake-<N>"
    const stakeLabel = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
    const stakeAmt = stakeLabel ? Number(stakeLabel.match(/(\d+)/)[1]) : null;
    const commentBody = stakeAmt
        ? `🎉  Thanks for opening this issue!\n\n🪙 **Stake required:** ${stakeAmt} coins.\n\nAnyone who submits a PR must first stake **${stakeAmt}** coins from their balance.`
        : `🎉  Thanks for opening this issue!`;
    try {
        const comment = await (0, githubComment_1.postIssueComment)(owner, repo, issueNumber, commentBody);
        res.status(201).json({ html_url: comment.html_url });
    }
    catch (err) {
        console.error("❌ Failed to post comment:", err);
        res.status(502).json({ error: err.message ?? "GitHub request failed" });
    }
};
exports.commentOnIssue = commentOnIssue;
async function fetchIssueDetails(owner, repo, issueNumber) {
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
        throw new Error(`GitHub API error fetching issue: ${resp.status} ${resp.statusText} — ${text}`);
    }
    return (await resp.json());
}
const commentOnPrs = async (req, res) => {
    console.log("📥 Incoming PR payload:", JSON.stringify(req.body, null, 2));
    const { owner, repo, prNumber, author, description = "", labels = [] } = req.body;
    if (!owner || !repo || !prNumber || !author) {
        res
            .status(400)
            .json({ error: "owner, repo, prNumber and author are required" });
        return;
    }
    /* ── 1.  Extract stake from PR labels (fallback) ─────────────── */
    const stakeFromPR = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
    let stakeAmt = stakeFromPR ? Number(stakeFromPR.match(/(\d+)/)[1]) : 0;
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
                stakeAmt = Number(stakeLabel.match(/(\d+)/)[1]);
            }
        }
        catch (e) {
            console.error("⚠️  Could not fetch linked issue:", e);
            // keep stakeAmt as-is; continue
        }
    }
    /* ── 3.  Build and post comment ───────────────────────────────── */
    const commentBody = `🎉  Thanks for opening this pull request, @${author}!

• Linked issue: **${issueRef}**
• 🪙 **Stake deducted:** ${stakeAmt} coins.`;
    try {
        const comment = await (0, githubComment_1.postIssueComment)(owner, repo, prNumber, commentBody);
        res.status(201).json({ html_url: comment.html_url });
    }
    catch (err) {
        console.error("❌ Failed to post PR comment:", err);
        res
            .status(502)
            .json({ error: err.message ?? "GitHub request failed" });
    }
};
exports.commentOnPrs = commentOnPrs;
const commentOnPrReview = async (req, res) => {
    console.log("📥 Incoming PR review payload:", JSON.stringify(req.body, null, 2));
    const { owner, repo, pullNumber, commitId, path, line, side, body: commentBody } = req.body;
    // Validate required fields
    if (!owner || !repo || !pullNumber || !commitId || !path || !line || !side || !commentBody) {
        res.status(400).json({
            error: "owner, repo, pullNumber, commitId, path, line, side and body are all required"
        });
        return;
    }
    try {
        const reviewComment = await (0, githubComment_1.postPullRequestReviewComment)(owner, repo, pullNumber, commitId, path, line, side, commentBody);
        // Return the URL of the created review comment
        res.status(201).json({ url: reviewComment.html_url || reviewComment.url });
    }
    catch (err) {
        console.error("❌ Failed to post PR review comment:", err);
        res.status(502).json({ error: err.message ?? "GitHub review-comment request failed" });
    }
};
exports.commentOnPrReview = commentOnPrReview;
const formComment = async (req, res) => {
    console.log("📥 Incoming XP-form payload:", JSON.stringify(req.body, null, 2));
    const { owner, repo, prNumber, commenter } = req.body;
    if (!owner || !repo || !prNumber || !commenter) {
        res.status(400).json({ error: "Missing required fields" });
        return;
    }
    console.log(`🎉 Creating contributor-rating form for @${commenter}`);
    /* ───────────────────────────────────────────────────────────────
       Redesigned markdown comment (looks close to your screenshot)
       ─────────────────────────────────────────────────────────────── */
    const commentBody = `
### 🟢 Merge Feedback  
*Rate this pull request before merging to help improve code quality.*

---

#### 🎯 Current Score  
\`0 / 25 points (0 %)\`

> Fill out the sliders / table below – the score will update automatically once you save the comment.

---

## ⭐ Quality Assessment  
| Category | Poor&nbsp;⬜ | Average&nbsp;⬜ | Good&nbsp;⬜ | Excellent&nbsp;⬜ | Score&nbsp;/5 |
|----------|:-----------:|:-------------:|:-----------:|:----------------:|:-------------:|
| **Code Quality & Standards** | ○ | ○ | ○ | ○ | &nbsp; |
| **Documentation & Comments** | ○ | ○ | ○ | ○ | &nbsp; |
| **Testing Coverage** | ○ | ○ | ○ | ○ | &nbsp; |
| **Performance Impact** | ○ | ○ | ○ | ○ | &nbsp; |
| **Security Considerations** | ○ | ○ | ○ | ○ | &nbsp; |

> &nbsp;⬜ = click to set your rating (1-5) and add notes if needed.

---

## 🎁 Bonus Points *(optional)*
| ✓ | Bonus | XP |
|---|-------|----|
| ☐ | Issue was bounty-backed | **+10** |
| ☐ | PR merged within 24-48 hrs | **+5** |
| ☐ | Contributor also reviewed other PRs | **+5** |
| ☐ | Contributor added meaningful tests | **+10** |

---

> **Maintainers:** to award extra XP, create a new comment like  
> \`@pullquestai add 50 xp to @${commenter}\`  (you can replace **50** with any whole-number).

Keep up the awesome work 🚀
`;
    try {
        const comment = await (0, githubComment_1.postPRFormComment)(owner, repo, prNumber, commentBody);
        console.log(`✅ Form posted successfully: ${comment.html_url}`);
        res.status(201).json({
            success: true,
            comment_url: comment.html_url,
            commenter,
            pr_number: prNumber
        });
    }
    catch (err) {
        console.error("❌ Failed to post contributor-rating form:", err);
        res.status(502).json({
            error: err.message ?? "GitHub request failed",
            details: { owner, repo, prNumber, commenter }
        });
    }
};
exports.formComment = formComment;
//# sourceMappingURL=commentController.js.map