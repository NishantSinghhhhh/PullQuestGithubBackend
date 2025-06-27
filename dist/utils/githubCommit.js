"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHeadCommitOfPR = fetchHeadCommitOfPR;
/* ------------------------------------------------------------------ */
/* 🚀 Fetch details for the current HEAD commit of a pull-request     */
/* ------------------------------------------------------------------ */
async function fetchHeadCommitOfPR(owner, repo, pullNumber, extraFetchInit = {}) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    /* 1️⃣  Get PR metadata to discover the HEAD SHA ------------------ */
    const prResp = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/` +
        `${encodeURIComponent(repo)}/pulls/${pullNumber}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
        },
        ...extraFetchInit,
    });
    if (!prResp.ok) {
        throw new Error(`Failed to fetch PR: ${prResp.status} ${prResp.statusText} — ${await prResp.text()}`);
    }
    const prJson = await prResp.json();
    const headSha = prJson.head.sha;
    /* 2️⃣  Lookup that commit --------------------------------------- */
    const commitResp = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/` +
        `${encodeURIComponent(repo)}/commits/${headSha}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
        },
        ...extraFetchInit,
    });
    if (!commitResp.ok) {
        throw new Error(`Failed to fetch commit ${headSha}: ` +
            `${commitResp.status} ${commitResp.statusText} — ${await commitResp.text()}`);
    }
    const commitData = (await commitResp.json());
    return { headSha, ...commitData };
}
//# sourceMappingURL=githubCommit.js.map