"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentOnIssues = commentOnIssues;
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
    console.log("📥 GitHub webhook received");
    // Check API key authorization
    const authHeader = req.headers.authorization;
    const expectedApiKey = process.env.PULLQUEST_API_KEY;
    if (expectedApiKey && (!authHeader || !authHeader.startsWith('Bearer ' + expectedApiKey))) {
        res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
        return;
    }
    try {
        // Extract data from GitHub webhook payload
        const { repository, number, pull_request, issue } = req.body;
        // Determine if it's a PR or issue
        const issueNumber = number || pull_request?.number || issue?.number;
        const repoFullName = repository?.full_name;
        if (!repoFullName || !issueNumber) {
            res.status(400).json({
                success: false,
                message: "Invalid GitHub webhook payload"
            });
            return;
        }
        // Get GitHub token
        const token = process.env.GITHUB_TOKEN || process.env.PULLQUEST_API_KEY;
        if (!token) {
            res.status(500).json({
                success: false,
                message: "GitHub token not configured"
            });
            return;
        }
        // Simple comment message
        const commentBody = "🤖 PullQuest AI here: Thanks for your contribution! Review is queued.";
        // Post comment to GitHub
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/issues/${issueNumber}/comments`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github.v3+json",
            },
            body: JSON.stringify({ body: commentBody }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ GitHub API error:", response.status, errorText);
            res.status(response.status).json({
                success: false,
                message: `GitHub API error: ${errorText}`
            });
            return;
        }
        const commentData = await response.json();
        console.log("✅ Comment posted successfully");
        res.status(201).json({
            success: true,
            comment: commentData
        });
    }
    catch (error) {
        console.error("❌ Error posting comment:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
}
//# sourceMappingURL=commentController.js.map