// src/controllers/commentController.ts
import { Request, Response, RequestHandler } from "express";
import { postIssueComment, postPullRequestReviewComment, postPRFormComment } from "../utils/githubComment";
import User from "../model/User";
import { fetchCompleteIssueData } from "../utils/githubComment";
import { ingestStakedIssue } from "../ingester/issueIngester";
import { fetchPRDetails } from "../utils/githubComment";
import { ingestMergedPR } from "../ingester/mergedPRIngester";

export const commentOnIssue: RequestHandler = async (req, res) => {
  console.log("📥 Incoming payload:", JSON.stringify(req.body, null, 2));

  const {
    owner,       // "PullQuest-Test"
    repo,        // "backend"
    issueNumber, // 6
    labels = []  // ["stake-30","question",…]
  }: {
    owner?: string;
    repo?: string;
    issueNumber?: number;
    labels?: string[];
  } = req.body;

  if (!owner || !repo || !issueNumber) {
    res.status(400).json({ error: "owner, repo and issueNumber are required" });
    return;
  }

  // look for "stake-<N>"
  const stakeLabel = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
  const stakeAmt   = stakeLabel ? Number(stakeLabel.match(/(\d+)/)![1]) : null;

  const commentBody = stakeAmt
    ? `🎉  Thanks for opening this issue!\n\n🪙 **Stake required:** ${stakeAmt} coins.\n\nAnyone who submits a PR must first stake **${stakeAmt}** coins from their balance.`
    : `🎉  Thanks for opening this issue!`;

  try {
    const comment = await postIssueComment(owner, repo, issueNumber, commentBody);
    res.status(201).json({ html_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub request failed" });
  }
};

async function fetchIssueDetails(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<{ labels: { name: string }[] }> {
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
    throw new Error(
      `GitHub API error fetching issue: ${resp.status} ${resp.statusText} — ${text}`
    );
  }
  return (await resp.json()) as any;
}


export const commentOnPrs: RequestHandler = async (req, res) => {
  console.log("📥 Incoming PR payload:", JSON.stringify(req.body, null, 2));

  const { owner, repo, prNumber, author, description = "", labels = [] } = req.body as {
    owner?: string;
    repo?: string;
    prNumber?: number;
    author?: string;
    description?: string;
    labels?: string[];
  };

  if (!owner || !repo || !prNumber || !author) {
    res
      .status(400)
      .json({ error: "owner, repo, prNumber and author are required" });
    return;
  }

  /* ── 0. Find user in database ─────────────────────────────────── */
  let user = null;
  try {
    user = await User.findOne({ 
      githubUsername: author,
      role: "contributor"
    });
    
    if (user) {
      console.log(`✅ Found contributor: ${author}`);
      console.log(`📊 User details:`);
      console.log(`   - Name: ${user.profile.name}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - XP: ${user.xp || 0}`);
      console.log(`   - Rank: ${user.rank}`);
      console.log(`   - Coins: ${user.coins}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Last Login: ${user.lastLogin}`);
    } else {
      console.log(`❌ Contributor not found: ${author} with role 'contributor'`);
    }
  } catch (error) {
    console.error("⚠️ Error finding user:", error);
  }

  /* ── 1. Extract stake from PR labels (fallback) ─────────────── */
  const stakeFromPR = labels.find(l => /^stake[-:\s]?(\d+)$/i.test(l));
  let stakeAmt = stakeFromPR ? Number(stakeFromPR.match(/(\d+)/)![1]) : 0;

  /* ── 2. Look for "#123" in PR body and fetch that issue's labels ─ */
  const issueMatch = description.match(/#(\d+)/);
  let issueRef = "no linked issue";
  let linkedIssueNumber: number | null = null;

  if (issueMatch) {
    linkedIssueNumber = Number(issueMatch[1]);
    issueRef = `#${linkedIssueNumber}`;

    try {
      const issueData = await fetchIssueDetails(owner, repo, linkedIssueNumber);
      const stakeLabel = issueData.labels
        .map(l => l.name)
        .find(n => /^stake[-:\s]?(\d+)$/i.test(n));

      if (stakeLabel) {
        stakeAmt = Number(stakeLabel.match(/(\d+)/)![1]);
      }
    } catch (e) {
      console.error("⚠️  Could not fetch linked issue:", e);
    }
  }

  /* ── 3. Check if user has enough coins for stake ──────────────── */
  let commentBody: string;
  
  if (user && stakeAmt > 0) {
    const userCoins = user.coins;
    
    if (userCoins >= stakeAmt) {
      console.log(`✅ ${author} has enough coins (${userCoins}) for stake (${stakeAmt})`);
      
      // 💰 ACTUALLY DEDUCT THE COINS AND AWARD XP
      user.coins -= stakeAmt;
      
      // 🎉 AWARD XP FOR OPENING PR WITH STAKE
      const xpReward = 10; // Base XP for opening a staked PR
      user.xp = (user.xp || 0) + xpReward;
      
      await user.save();
      console.log(`💰 Deducted ${stakeAmt} coins. New balance: ${user.coins}`);
      console.log(`🎉 Awarded ${xpReward} XP. New XP: ${user.xp}`);
      console.log(`🏆 Current rank: ${user.rank}`);
      
      // 🔍 FETCH ISSUE DATA AND INGEST TO STAKED ISSUES DB
      if (linkedIssueNumber) {
        try {
          console.log(`🔍 Fetching and ingesting issue #${linkedIssueNumber}...`);
          
          // Fetch complete issue data from GitHub API
          const fullIssueData = await fetchCompleteIssueData(owner, repo, linkedIssueNumber);
          
          // Ingest the staked issue using the ingester function
          const ingestionResult = await ingestStakedIssue({
            issueData: fullIssueData,
            stakingUser: user,
            stakeAmount: stakeAmt,
            prNumber: prNumber,
            owner: owner,
            repo: repo
          });
          
          console.log(`✅ Issue ingestion result: ${ingestionResult.message}`);
          
        } catch (error) {
          console.error("❌ Failed to fetch/ingest issue data:", error);
          // Continue execution even if ingestion fails
        }
      }
      
      commentBody = `🎉 Thanks for opening this pull request, @${author}!

• Linked issue: **${issueRef}**
• 🪙 **Stake deducted:** ${stakeAmt} coins.
• 💰 **Remaining balance:** ${user.coins} coins.
• 🎉 **XP awarded:** +${xpReward} XP (Total: ${user.xp})
• 🏆 **Current rank:** ${user.rank}`;
    } else {
      console.log(`❌ ${author} doesn't have enough coins (${userCoins}) for stake (${stakeAmt})`);
      commentBody = `❌ Sorry @${author}, you cannot open this PR.

• **Required stake:** ${stakeAmt} coins
• **Your current coins:** ${userCoins} coins
• **Insufficient funds:** You need ${stakeAmt - userCoins} more coins.

**@maintainers:** Please close this PR as the contributor doesn't have sufficient stake.`;
    }
  } else {
    // No user found or no stake required
    commentBody = `🎉 Thanks for opening this pull request, @${author}!

• Linked issue: **${issueRef}**
• 🪙 **Stake deducted:** ${stakeAmt} coins.`;
  }

  try {
    const comment = await postIssueComment(owner, repo, prNumber, commentBody);
    res.status(201).json({ html_url: comment.html_url });
  } catch (err: any) {
    console.error("❌ Failed to post PR comment:", err);
    res
      .status(502)
      .json({ error: err.message ?? "GitHub request failed" });
  }
};

export const commentOnPrReview: RequestHandler = async (req, res) => {
  console.log("📥 Incoming PR review payload:", JSON.stringify(req.body, null, 2));

  const {
    owner,
    repo,
    pullNumber,
    commitId,
    path,
    line,
    side,
    body: commentBody
  }: {
    owner?: string;
    repo?: string;
    pullNumber?: number;
    commitId?: string;
    path?: string;
    line?: number;
    side?: "LEFT" | "RIGHT";
    body?: string;
  } = req.body;

  // Validate required fields
  if (!owner || !repo || !pullNumber || !commitId || !path || !line || !side || !commentBody) {
    res.status(400).json({
      error: "owner, repo, pullNumber, commitId, path, line, side and body are all required"
    });
    return;
  }

  try {
    const reviewComment = await postPullRequestReviewComment(
      owner,
      repo,
      pullNumber,
      commitId,
      path,
      line,
      side,
      commentBody
    );
    // Return the URL of the created review comment
    res.status(201).json({ url: reviewComment.html_url || reviewComment.url });
  } catch (err: any) {
    console.error("❌ Failed to post PR review comment:", err);
    res.status(502).json({ error: err.message ?? "GitHub review-comment request failed" });
  }
};

export const formComment: RequestHandler = async (req, res) => {
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
    const comment = await postPRFormComment(owner, repo, prNumber, commentBody);
    console.log(`✅ Form posted successfully: ${comment.html_url}`);

    res.status(201).json({
      success: true,
      comment_url: comment.html_url,
      commenter,
      pr_number: prNumber
    });
  } catch (err: any) {
    console.error("❌ Failed to post contributor-rating form:", err);
    res.status(502).json({
      error: err.message ?? "GitHub request failed",
      details: { owner, repo, prNumber, commenter }
    });
  }
};
export const AddbonusXp: RequestHandler = async (req, res) => {
  console.log("📥 Incoming bonus XP payload:", JSON.stringify(req.body, null, 2));
  
  const { owner, repo, prNumber, targetUser, xpAmount, requester } = req.body;
  
  if (!owner || !repo || !prNumber || !targetUser || !xpAmount) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  
  console.log(`🎉 Adding ${xpAmount} XP to @${targetUser}`);
  
  try {
    /* ── 1. Find the target user in database ─────────────────────── */
    const user = await User.findOne({ 
      githubUsername: targetUser,
      role: "contributor"
    });
    
    if (!user) {
      console.log(`❌ User not found: ${targetUser}`);
      const commentBody = `❌ Error: User @${targetUser} not found in our system.`;
      const comment = await postPRFormComment(owner, repo, prNumber, commentBody);
      res.status(404).json({ 
        error: "User not found", 
        comment_url: comment.html_url 
      });
      return;
    }
    
    console.log(`✅ Found user: ${targetUser}`);
    
    /* ── 2. Add XP to user profile ──────────────────────────────── */
    const oldXp = user.xp || 0;
    const oldRank = user.rank;
    
    user.xp = oldXp + Number(xpAmount);
    user.lastLogin = new Date();
    await user.save();
    
    console.log(`💰 XP: ${oldXp} → ${user.xp} (+${xpAmount})`);
    
    /* ── 3. Fetch PR details and ingest to MergedPR collection ──── */
    let ingestionResult = null;
    try {
      const prData = await fetchPRDetails(owner, repo, prNumber);
      
      ingestionResult = await ingestMergedPR({
        prData: prData,
        awardedUser: user,
        bonusXpAmount: Number(xpAmount),
        awardedBy: requester || "maintainer",
        owner: owner,
        repo: repo
      });
      
      console.log(`✅ PR ingested: ${ingestionResult.message}`);
      
    } catch (error) {
      console.error("❌ Failed to ingest PR data:", error);
    }
    
    /* ── 4. Post enhanced success comment ───────────────────────── */
    const rankChange = oldRank !== user.rank ? ` → **${user.rank}**` : "";
    const ingestionStatus = ingestionResult 
      ? `\n• 📊 **PR Data**: Successfully recorded in merge history`
      : `\n• ⚠️ **PR Data**: Could not record merge history`;
    
    const commentBody = `🎉 **Bonus XP Awarded Successfully!**

✅ Added **${xpAmount} XP** to @${targetUser}

📊 **Updated User Stats:**
• **XP**: ${oldXp} → **${user.xp}** (+${xpAmount})
• **Rank**: ${oldRank}${rankChange}
• **Total Coins**: ${user.coins}${ingestionStatus}

🏆 **PR Summary:**
• **Pull Request**: #${prNumber}
• **Repository**: ${owner}/${repo}
• **Awarded by**: ${requester || 'maintainer'}

Keep up the excellent work! 🚀`;
    
    const comment = await postPRFormComment(owner, repo, prNumber, commentBody);
    
    res.status(201).json({ 
      success: true, 
      comment_url: comment.html_url,
      user_stats: {
        username: user.githubUsername,
        old_xp: oldXp,
        new_xp: user.xp,
        xp_added: Number(xpAmount),
        old_rank: oldRank,
        new_rank: user.rank,
        coins: user.coins
      },
      pr_ingestion: {
        success: !!ingestionResult,
        message: ingestionResult?.message || "Failed to ingest PR data",
        database_id: ingestionResult?.mergedPRId || null,
        is_update: ingestionResult?.isUpdate || false
      }
    });
    
  } catch (err: any) {
    console.error("❌ Failed to process bonus XP:", err);
    res.status(502).json({ 
      error: err.message ?? "Failed to process bonus XP"
    });
  }
};