"use strict";
// src/utils/github.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.postIssueComment = postIssueComment;
exports.postPullRequestComment = postPullRequestComment;
exports.postPullRequestReviewComment = postPullRequestReviewComment;
async function postIssueComment(owner, repo, issueNumber, commentBody) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: commentBody }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error posting comment: ${res.status} ${res.statusText} — ${text}`);
    }
    return (await res.json());
}
async function postPullRequestComment(owner, repo, pullNumber, commentBody) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${pullNumber}/comments`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: commentBody }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error posting PR comment: ${res.status} ${res.statusText} — ${text}`);
    }
    return (await res.json());
}
async function postPullRequestReviewComment(owner, repo, pullNumber, commitId, path, line, side, commentBody) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
        `${encodeURIComponent(repo)}/pulls/${pullNumber}/comments`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            body: commentBody,
            commit_id: commitId,
            path,
            line,
            side,
            // For multi-line comments, you can also include:
            // start_line: <number>,
            // start_side: "LEFT" | "RIGHT"
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error posting review comment: ${res.status} ${res.statusText} — ${text}`);
    }
    return (await res.json());
}
//# sourceMappingURL=githubComment.js.map