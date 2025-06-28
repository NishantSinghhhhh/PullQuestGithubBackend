"use strict";
// utils/mergedPRIngester.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestMergedPR = ingestMergedPR;
exports.fetchPRDetails = fetchPRDetails;
const MergedPrs_1 = __importDefault(require("../model/MergedPrs"));
async function ingestMergedPR(params) {
    const { prData, awardedUser, bonusXpAmount, awardedBy, owner, repo } = params;
    console.log(`📥 Ingesting merged PR #${prData.number} with ${bonusXpAmount} XP for ${awardedUser.githubUsername}`);
    try {
        // Check if this PR is already ingested
        const existingPR = await MergedPrs_1.default.findOne({
            prId: prData.id,
            'awardedUser.userId': awardedUser._id.toString()
        });
        if (existingPR) {
            console.log(`⚠️ PR #${prData.number} already ingested for ${awardedUser.githubUsername}`);
            // Update existing record with new bonus XP
            existingPR.bonusXpAwarded += bonusXpAmount;
            existingPR.awardedAt = new Date();
            await existingPR.save();
            return {
                success: true,
                mergedPRId: existingPR._id,
                message: `Updated existing merged PR with additional ${bonusXpAmount} XP`,
                isUpdate: true
            };
        }
        // Create new merged PR record
        const mergedPR = new MergedPrs_1.default({
            // Core PR fields
            prId: prData.id,
            prNumber: prData.number,
            title: prData.title,
            body: prData.body || "",
            state: prData.state,
            htmlUrl: prData.html_url,
            // PR author
            author: {
                id: prData.user.id,
                login: prData.user.login,
                avatarUrl: prData.user.avatar_url,
                htmlUrl: prData.user.html_url,
                type: prData.user.type
            },
            // User who received the bonus XP
            awardedUser: {
                userId: awardedUser._id.toString(),
                githubUsername: awardedUser.githubUsername || "",
                githubId: 0, // Placeholder
                avatarUrl: "" // Placeholder
            },
            // XP and bonus info
            bonusXpAwarded: bonusXpAmount,
            awardedBy: awardedBy,
            awardedAt: new Date(),
            // Repository info
            repository: {
                id: prData.base?.repo?.id || 0,
                name: repo,
                fullName: `${owner}/${repo}`,
                htmlUrl: `https://github.com/${owner}/${repo}`,
                language: prData.base?.repo?.language || "",
                stargazersCount: prData.base?.repo?.stargazers_count || 0,
                forksCount: prData.base?.repo?.forks_count || 0,
                description: prData.base?.repo?.description || ""
            },
            // Metadata
            labels: prData.labels?.map(label => ({
                id: label.id,
                name: label.name,
                color: label.color,
                description: label.description || ""
            })) || [],
            // PR stats
            additions: prData.additions || 0,
            deletions: prData.deletions || 0,
            changedFiles: prData.changed_files || 0,
            commentsCount: prData.comments || 0,
            // Timestamps
            prCreatedAt: new Date(prData.created_at),
            prUpdatedAt: new Date(prData.updated_at),
            prMergedAt: prData.merged_at ? new Date(prData.merged_at) : new Date(),
            prClosedAt: prData.closed_at ? new Date(prData.closed_at) : undefined,
            // Status
            status: "bonus_awarded",
            merged: prData.merged || true
        });
        await mergedPR.save();
        console.log(`✅ Successfully ingested merged PR:`);
        console.log(`   - PR: #${prData.number} - ${prData.title}`);
        console.log(`   - Awarded User: ${awardedUser.githubUsername}`);
        console.log(`   - Bonus XP: ${bonusXpAmount}`);
        console.log(`   - Awarded By: ${awardedBy}`);
        console.log(`   - Database ID: ${mergedPR._id}`);
        return {
            success: true,
            mergedPRId: mergedPR._id,
            message: `Successfully ingested merged PR #${prData.number} with ${bonusXpAmount} XP`,
            isUpdate: false
        };
    }
    catch (error) {
        console.error(`❌ Failed to ingest merged PR #${prData.number}:`, error);
        throw error;
    }
}
/**
 * Fetch PR details from GitHub API
 */
async function fetchPRDetails(owner, repo, prNumber) {
    const token = process.env.GITHUB_API_TOKEN;
    if (!token) {
        throw new Error("GITHUB_API_TOKEN environment variable is not set");
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
        console.error(`❌ Response: ${errorText}`);
        throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const prData = await response.json();
    console.log(`✅ Successfully fetched PR #${prData.number}: ${prData.title}`);
    return prData;
}
//# sourceMappingURL=mergedPRIngester.js.map