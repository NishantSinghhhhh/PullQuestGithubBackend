// utils/mergedPRIngester.ts

import { IUser } from '../model/User';
import { Types } from 'mongoose';
import MergedPR from '../model/MergedPrs';

interface GitHubPRData {
  id: number;
  number: number;
  title: string;
  body: string;
  state: string;
  html_url: string;
  user: {
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
    type: string;
  };
  labels: Array<{
    id: number;
    name: string;
    color: string;
    description: string;
  }>;
  base?: {
    repo?: {
      id: number;
      language: string;
      stargazers_count: number;
      forks_count: number;
      description: string;
    };
  };
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  merged: boolean;
  created_at: string;
  updated_at: string;
  merged_at?: string;
  closed_at?: string;
}

interface MergedPRIngestionParams {
  prData: GitHubPRData;
  awardedUser: IUser;
  bonusXpAmount: number;
  awardedBy: string;
  owner: string;
  repo: string;
}

export async function ingestMergedPR(params: MergedPRIngestionParams) {
    const { prData, awardedUser, bonusXpAmount, awardedBy, owner, repo } = params;
    
    console.log(`📥 Ingesting merged PR #${prData.number} with ${bonusXpAmount} XP for ${awardedUser.githubUsername}`);
    
    try {
      // Check if this PR is already ingested
      const existingPR = await MergedPR.findOne({
        prId: prData.id,
        'awardedUser.userId': (awardedUser._id as Types.ObjectId).toString()
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
      const mergedPR = new MergedPR({
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
          userId: (awardedUser._id as Types.ObjectId).toString(),
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
      
    } catch (error) {
      console.error(`❌ Failed to ingest merged PR #${prData.number}:`, error);
      throw error;
    }
  }
  