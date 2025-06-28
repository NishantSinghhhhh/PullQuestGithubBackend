"use strict";
// src/utils/github.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.postIssueComment = postIssueComment;
exports.postPullRequestComment = postPullRequestComment;
exports.postPullRequestReviewComment = postPullRequestReviewComment;
exports.postPRFormComment = postPRFormComment;
exports.fetchCompleteIssueData = fetchCompleteIssueData;
exports.fetchPRDetails = fetchPRDetails;
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
async function postPRFormComment(owner, repo, issueNumber, commentBody) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`;
    console.log(`🔗 Posting to: ${url}`);
    console.log(`🔑 Token exists: ${!!token}`);
    console.log(`📝 Comment body length: ${commentBody.length}`);
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: commentBody }),
    });
    console.log(`📊 Response status: ${res.status}`);
    if (!res.ok) {
        const text = await res.text();
        console.error(`❌ GitHub API error: ${res.status} ${res.statusText}`);
        console.error(`❌ Response body: ${text}`);
        throw new Error(`GitHub API error posting comment: ${res.status} ${res.statusText} — ${text}`);
    }
    const result = await res.json();
    console.log(`✅ Comment posted successfully: ${result.html_url}`);
    return result;
}
async function fetchCompleteIssueData(owner, repo, issueNumber) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'PullQuestAI-Bot',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    return await response.json();
}
async function fetchPRDetails(owner, repo, prNumber) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        throw new Error("GITHUB_TOKEN environment variable is not set");
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    console.log(`🔍 Fetching PR data from: ${url}`);
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'PullQuestAI-Bot',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ GitHub API error: ${response.status} ${response.statusText}`);
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const prData = await response.json();
    console.log(`✅ Successfully fetched PR #${prData.number}: ${prData.title}`);
    return prData;
}
//# sourceMappingURL=githubComment.js.map