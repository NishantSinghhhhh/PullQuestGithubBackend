"use strict";
// src/utils/github.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.postIssueComment = postIssueComment;
exports.postPullRequestComment = postPullRequestComment;
exports.postPullRequestReviewComment = postPullRequestReviewComment;
exports.postPRFormComment = postPRFormComment;
exports.fetchCompleteIssueData = fetchCompleteIssueData;
exports.fetchPRDetails = fetchPRDetails;
exports.getCorrectCommitSha = getCorrectCommitSha;
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
async function postPullRequestReviewComment(owner, repo, pullNumber, commitId, path, line, side, commentBody, diff // ← Add the diff parameter
) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    // Extract the diff hunk for this specific line
    const diffHunk = extractDiffHunk(diff, path, line, side);
    if (!diffHunk) {
        console.error(`❌ Could not find diff hunk for ${path}:${line} (${side})`);
        throw new Error(`Could not extract diff hunk for ${path}:${line}`);
    }
    console.log(`🔍 Using diff hunk for ${path}:${line}:`);
    console.log(diffHunk.substring(0, 200) + "...");
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/` +
        `${encodeURIComponent(repo)}/pulls/${pullNumber}/comments`;
    const payload = {
        body: commentBody,
        commit_id: commitId,
        path: path,
        diff_hunk: diffHunk, // ← Add the diff hunk
        line: line,
        side: side.toLowerCase() // ← GitHub expects lowercase
    };
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const text = await res.text();
        console.error(`❌ GitHub API Error Details:`, {
            status: res.status,
            statusText: res.statusText,
            response: text,
            payload: { ...payload, diff_hunk: payload.diff_hunk.substring(0, 100) + "..." }
        });
        throw new Error(`GitHub API error posting review comment: ${res.status} ${res.statusText} — ${text}`);
    }
    const result = await res.json();
    console.log(`✅ Successfully posted comment: ${result.html_url}`);
    return result;
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
// In src/utils/githubComment.ts (or wherever your GitHub functions are)
async function getCorrectCommitSha(owner, repo, prNumber) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch PR: ${response.status} ${response.statusText}`);
    }
    const prData = await response.json();
    const headSha = prData.head.sha;
    console.log(`🔍 Using HEAD SHA from PR API: ${headSha}`);
    return headSha;
}
function extractDiffHunk(unifiedDiff, targetFile, targetLine, side) {
    const lines = unifiedDiff.split("\n");
    let currentFile = "";
    let hunkLines = [];
    let inTargetFile = false;
    let oldLineNum = 0;
    let newLineNum = 0;
    let foundTargetLine = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Reset when encountering a new file
        if (line.startsWith("diff --git")) {
            if (foundTargetLine && hunkLines.length > 0) {
                return hunkLines.join("\n");
            }
            hunkLines = [];
            inTargetFile = false;
            foundTargetLine = false;
            continue;
        }
        // File path detection
        if (line.startsWith("+++ b/")) {
            currentFile = line.slice(6).trim();
            inTargetFile = currentFile === targetFile;
            continue;
        }
        if (!inTargetFile)
            continue;
        // Hunk header
        if (line.startsWith("@@")) {
            const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
            if (match) {
                oldLineNum = Number(match[1]);
                newLineNum = Number(match[2]);
                hunkLines = [line];
            }
            continue;
        }
        // Content lines
        if (hunkLines.length > 0) {
            hunkLines.push(line);
            if (line.startsWith(" ")) {
                // Context line
                if ((side === "LEFT" && oldLineNum === targetLine) ||
                    (side === "RIGHT" && newLineNum === targetLine)) {
                    foundTargetLine = true;
                }
                oldLineNum++;
                newLineNum++;
            }
            else if (line.startsWith("-")) {
                // Deleted line
                if (side === "LEFT" && oldLineNum === targetLine) {
                    foundTargetLine = true;
                }
                oldLineNum++;
            }
            else if (line.startsWith("+")) {
                // Added line
                if (side === "RIGHT" && newLineNum === targetLine) {
                    foundTargetLine = true;
                }
                newLineNum++;
            }
        }
    }
    return foundTargetLine && hunkLines.length > 0 ? hunkLines.join("\n") : null;
}
//# sourceMappingURL=githubComment.js.map