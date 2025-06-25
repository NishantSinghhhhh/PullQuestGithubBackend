"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentOnIssues = commentOnIssues;
const rest_1 = require("@octokit/rest");
const RANDOM_COMMENTS = [
    "Thanks for opening this PR! The team will review it shortly.",
    "🚀 PullQuest AI here: I've glanced at this PR and will get back to you soon!",
    "🤖 Automated review: Thanks for your contribution! We'll take a look ASAP.",
    "📝 PullQuest AI comment: Great work—review is queued!",
];
function buildComment(n, repo, url, labels, stake) {
    const labelList = labels.length
        ? labels.map((l) => `\`${l}\``).join(" ")
        : "_none_";
    let body = `
### 🤖 PullQuest is on it!

Issue / PR **#${n}** in **${repo}** has been queued for automated review.  
**Labels:** ${labelList}`.trim();
    if (stake !== undefined) {
        body += `

🔖 **Stake:** ${stake} coin${stake === 1 ? "" : "s"}`;
    }
    body += `

🔗 ${url}
`;
    return body;
}
async function commentOnIssues(req, res, next) {
    // ── LOG EVERYTHING ─────────────────────────────────────────────────────
    console.log("📥 Incoming commentOnIssues request");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    // 1️⃣ Destructure expected payload
    const { repo: fullRepo, issue_number, issue_url, labels, } = req.body;
    // 2️⃣ Token from header or env
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ")
        ? auth.slice(7)
        : process.env.PULLQUEST_API_KEY;
    // ── 1. Basic validation ───────────────────────────────────────────────
    if (!token) {
        res.status(401).json({ success: false, message: "Missing API token" });
        return;
    }
    if (!fullRepo ||
        typeof fullRepo !== "string" ||
        typeof issue_number !== "number" ||
        !issue_url ||
        !Array.isArray(labels)) {
        res
            .status(400)
            .json({ success: false, message: "Missing or invalid fields" });
        return;
    }
    // ── 2. parse owner/repo ─────────────────────────────────────────────
    const parts = fullRepo.split("/");
    if (parts.length !== 2) {
        res
            .status(400)
            .json({ success: false, message: "`repo` must be 'owner/repo'" });
        return;
    }
    const [owner, repoName] = parts;
    try {
        // ── 3. detect stake label ──────────────────────────────────────────
        let stake;
        for (const name of labels) {
            const m = name.match(/stake[:\-]?(\d+)/i);
            if (m) {
                stake = parseInt(m[1], 10);
                break;
            }
        }
        // ── 4. craft comment ───────────────────────────────────────────────
        const commentBody = stake === undefined && labels.length === 0
            ? RANDOM_COMMENTS[Math.floor(Math.random() * RANDOM_COMMENTS.length)]
            : buildComment(issue_number, fullRepo, issue_url, labels, stake);
        // ── 5. post to GitHub ─────────────────────────────────────────────
        const octokit = new rest_1.Octokit({ auth: token });
        const response = await octokit.issues.createComment({
            owner,
            repo: repoName,
            issue_number,
            body: commentBody,
        });
        res.status(201).json({
            success: true,
            message: "Comment posted successfully",
            comment: response.data,
        });
        return;
    }
    catch (err) {
        console.error("❌ Error in commentOnIssues:", err);
        res
            .status(500)
            .json({ success: false, message: err.message || "Internal error" });
        return;
    }
}
//# sourceMappingURL=commentController.js.map