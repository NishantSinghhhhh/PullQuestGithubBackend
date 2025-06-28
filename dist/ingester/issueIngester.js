"use strict";
// utils/issueIngester.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestStakedIssue = ingestStakedIssue;
exports.updateStakedIssueStatus = updateStakedIssueStatus;
const StakedIssue_1 = __importDefault(require("../model/StakedIssue"));
/**
 * Ingests a staked issue into the database
 */
async function ingestStakedIssue(params) {
    const { issueData, stakingUser, stakeAmount, prNumber, owner, repo } = params;
    console.log(`📥 Ingesting staked issue #${issueData.number} for user ${stakingUser.githubUsername}`);
    try {
        // Check if this issue is already staked by this user
        const existingStake = await StakedIssue_1.default.findOne({
            issueId: issueData.id,
            'stakingUser.userId': stakingUser._id.toString(),
            status: 'active'
        });
        if (existingStake) {
            console.log(`⚠️ Issue #${issueData.number} already staked by ${stakingUser.githubUsername}`);
            throw new Error(`You have already staked this issue #${issueData.number}`);
        }
        // Extract difficulty and XP reward from labels
        const difficultyLabel = issueData.labels.find(label => ['easy', 'medium', 'hard', 'expert'].includes(label.name.toLowerCase()));
        const xpLabel = issueData.labels.find(label => /^xp[-:\s]?(\d+)$/i.test(label.name));
        const bountyLabel = issueData.labels.find(label => /^bounty[-:\s]?(\d+)$/i.test(label.name));
        // Create the staked issue record
        const stakedIssue = new StakedIssue_1.default({
            // Core issue fields
            issueId: issueData.id,
            issueNumber: issueData.number,
            title: issueData.title,
            body: issueData.body || "",
            state: issueData.state,
            htmlUrl: issueData.html_url,
            // Original issue creator
            issueCreator: {
                id: issueData.user.id,
                login: issueData.user.login,
                avatarUrl: issueData.user.avatar_url,
                htmlUrl: issueData.user.html_url,
                type: issueData.user.type
            },
            // Staking user (who staked coins)
            stakingUser: {
                userId: stakingUser._id.toString(),
                githubUsername: stakingUser.githubUsername || "",
                githubId: 0, // We'll set this to 0 for now since it's not in your User model
                avatarUrl: "" // We'll set this to empty for now since it's not in your User model
            },
            // Metadata
            labels: issueData.labels.map(label => ({
                id: label.id,
                name: label.name,
                color: label.color,
                description: label.description || ""
            })),
            milestone: issueData.milestone ? {
                id: issueData.milestone.id,
                title: issueData.milestone.title,
                description: issueData.milestone.description || "",
                state: issueData.milestone.state,
                dueOn: issueData.milestone.due_on ? new Date(issueData.milestone.due_on) : undefined
            } : undefined,
            repository: {
                id: issueData.repository?.id || 0,
                name: repo,
                fullName: `${owner}/${repo}`,
                htmlUrl: `https://github.com/${owner}/${repo}`,
                language: issueData.repository?.language || "",
                stargazersCount: issueData.repository?.stargazers_count || 0,
                forksCount: issueData.repository?.forks_count || 0,
                description: issueData.repository?.description || ""
            },
            // Staking specific fields
            stakeAmount: stakeAmount,
            stakingDate: new Date(),
            status: "active",
            // Progress tracking
            prNumber: prNumber,
            prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
            // Rewards (extracted from labels)
            xpReward: xpLabel ? Number(xpLabel.name.match(/(\d+)/)[1]) : undefined,
            bountyReward: bountyLabel ? Number(bountyLabel.name.match(/(\d+)/)[1]) : undefined,
            // Issue metadata
            difficulty: difficultyLabel?.name.toLowerCase(),
            commentsCount: issueData.comments || 0,
            authorAssociation: issueData.author_association,
            // Timestamps
            issueCreatedAt: new Date(issueData.created_at),
            issueUpdatedAt: new Date(issueData.updated_at),
            issueClosedAt: issueData.closed_at ? new Date(issueData.closed_at) : undefined
        });
        // Save to database
        await stakedIssue.save();
        console.log(`✅ Successfully ingested staked issue:`);
        console.log(`   - Issue: #${issueData.number} - ${issueData.title}`);
        console.log(`   - Staking User: ${stakingUser.githubUsername}`);
        console.log(`   - Stake Amount: ${stakeAmount} coins`);
        console.log(`   - XP Reward: ${stakedIssue.xpReward || 'N/A'}`);
        console.log(`   - Difficulty: ${stakedIssue.difficulty || 'N/A'}`);
        console.log(`   - Database ID: ${stakedIssue._id}`);
        return {
            success: true,
            stakedIssueId: stakedIssue._id,
            message: `Successfully staked ${stakeAmount} coins on issue #${issueData.number}`
        };
    }
    catch (error) {
        console.error(`❌ Failed to ingest staked issue #${issueData.number}:`, error);
        throw error;
    }
}
/**
 * Update staked issue when PR is completed/merged
 */
async function updateStakedIssueStatus(issueId, stakingUserId, status) {
    try {
        const stakedIssue = await StakedIssue_1.default.findOne({
            issueId: issueId,
            'stakingUser.userId': stakingUserId,
            status: 'active'
        });
        if (!stakedIssue) {
            throw new Error(`No active staked issue found for issue #${issueId}`);
        }
        stakedIssue.status = status;
        if (status === 'completed') {
            stakedIssue.completedAt = new Date();
        }
        else if (status === 'refunded') {
            stakedIssue.refundedAt = new Date();
        }
        await stakedIssue.save();
        console.log(`✅ Updated staked issue status to: ${status}`);
        return stakedIssue;
    }
    catch (error) {
        console.error(`❌ Failed to update staked issue status:`, error);
        throw error;
    }
}
//# sourceMappingURL=issueIngester.js.map