"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePRSummary = exports.handleCodeReview = void 0;
const openai_1 = require("../utils/openai");
const openai_2 = __importDefault(require("openai"));
const handleCodeReview = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: "Code is required" });
            return;
        }
        const result = await (0, openai_1.reviewCodeWithAI)({ code });
        res.json(result);
    }
    catch (error) {
        console.error("Error reviewing code:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
exports.handleCodeReview = handleCodeReview;
const handlePRSummary = async (req, res) => {
    console.log("📝 Starting PR summary generation");
    console.log("🔍 === INCOMING REQUEST DETAILS ===");
    // Log the entire request body
    console.log("📦 Full Request Body:");
    console.log(JSON.stringify(req.body, null, 2));
    // Log request headers
    console.log("📋 Request Headers:");
    console.log(JSON.stringify(req.headers, null, 2));
    // Log request method and URL
    console.log("🌐 Request Details:");
    console.log(`   Method: ${req.method}`);
    console.log(`   URL: ${req.url}`);
    console.log(`   Content-Type: ${req.headers['content-type']}`);
    console.log(`   User-Agent: ${req.headers['user-agent']}`);
    const { owner, repo, prNumber, title, description, author, metadata, diff } = req.body;
    // Log extracted parameters
    console.log("🎯 === EXTRACTED PARAMETERS ===");
    console.log(`   Owner: "${owner}"`);
    console.log(`   Repo: "${repo}"`);
    console.log(`   PR Number: ${prNumber}`);
    console.log(`   Title: "${title}"`);
    console.log(`   Description: "${description}"`);
    console.log(`   Author: "${author}"`);
    console.log(`   Metadata: ${metadata ? JSON.stringify(metadata, null, 2) : 'null'}`);
    console.log(`   Diff length: ${diff ? diff.length : 'undefined'} characters`);
    console.log(`   Diff preview: ${diff ? diff.substring(0, 200) + '...' : 'No diff provided'}`);
    if (!owner || !repo || !prNumber) {
        console.log("❌ Missing required parameters:");
        console.log(`   Owner present: ${!!owner}`);
        console.log(`   Repo present: ${!!repo}`);
        console.log(`   PR Number present: ${!!prNumber}`);
        res.status(400).json({ error: "owner, repo, and prNumber are required" });
        return;
    }
    try {
        console.log(`📝 Generating summary for PR #${prNumber} in ${owner}/${repo}`);
        console.log(`🎯 PR Title: "${title}"`);
        console.log(`👤 Author: ${author || 'Unknown'}`);
        /* 1️⃣ Initialize OpenAI client with local environment key */
        const openaiApiKey = process.env.OPENAI_API_KEY;
        console.log(`🔑 OpenAI API Key present: ${!!openaiApiKey}`);
        console.log(`🔑 OpenAI API Key length: ${openaiApiKey ? openaiApiKey.length : 0}`);
        console.log(`🔑 OpenAI API Key starts with: ${openaiApiKey ? openaiApiKey.substring(0, 7) + '...' : 'N/A'}`);
        if (!openaiApiKey) {
            console.log("❌ OPENAI_API_KEY environment variable is not set");
            throw new Error("OPENAI_API_KEY environment variable is not set in backend");
        }
        const openai = new openai_2.default({ apiKey: openaiApiKey });
        console.log("✅ OpenAI client initialized successfully");
        /* 2️⃣ Use provided diff or fetch from GitHub */
        let finalDiff = diff;
        if (!finalDiff) {
            console.log("📡 No diff provided, fetching from GitHub API...");
            finalDiff = await fetchPRDiff(owner, repo, prNumber);
            console.log(`📡 Fetched diff length: ${finalDiff.length} characters`);
        }
        else {
            console.log("📄 Using provided diff from request");
        }
        /* 3️⃣ Fetch repository context */
        console.log("🏗️ Fetching repository context...");
        const repoContext = await fetchRepositoryContext(owner, repo);
        console.log("🏗️ Repository context:");
        console.log(JSON.stringify(repoContext, null, 2));
        /* 4️⃣ Generate AI summary */
        console.log("🤖 Preparing AI summary generation...");
        console.log("🤖 Summary input data:");
        console.log(`   Title: "${title}"`);
        console.log(`   Description: "${description || 'No description provided'}"`);
        console.log(`   Author: "${author || 'Unknown'}"`);
        console.log(`   PR Number: ${prNumber}`);
        console.log(`   Diff length: ${finalDiff.length} characters`);
        console.log(`   Metadata: ${metadata ? JSON.stringify(metadata) : 'null'}`);
        const summaryResult = await generateAISummary(openai, {
            title,
            description: description || 'No description provided',
            diff: finalDiff,
            repoContext,
            prNumber,
            author: author || 'Unknown',
            metadata
        });
        console.log("🤖 AI Summary Result:");
        console.log(JSON.stringify(summaryResult, null, 2));
        /* 5️⃣ Post summary as comment on PR */
        console.log("💬 Posting summary comment to GitHub...");
        await postSummaryComment(owner, repo, prNumber, summaryResult);
        /* 6️⃣ Return results */
        const response = {
            success: true,
            prNumber,
            author,
            summary: summaryResult,
            message: `Successfully generated and posted summary for PR #${prNumber}`
        };
        console.log("✅ === FINAL RESPONSE ===");
        console.log(JSON.stringify(response, null, 2));
        console.log("✅ PR summary generation complete");
        res.status(200).json(response);
    }
    catch (err) {
        console.error("❌ === ERROR DETAILS ===");
        console.error("❌ Error name:", err.name);
        console.error("❌ Error message:", err.message);
        console.error("❌ Error stack:", err.stack);
        console.error("❌ Full error object:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
        res.status(500).json({
            error: "PR summary generation failed: " + err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};
exports.handlePRSummary = handlePRSummary;
/* 🤖 Generate AI-powered PR summary */
async function generateAISummary(openai, prData) {
    console.log("🤖 === AI SUMMARY GENERATION ===");
    console.log("🤖 Input validation:");
    console.log(`   Title length: ${prData.title.length}`);
    console.log(`   Description length: ${prData.description.length}`);
    console.log(`   Diff length: ${prData.diff.length}`);
    console.log(`   Author: ${prData.author}`);
    console.log(`   PR Number: ${prData.prNumber}`);
    const summaryPrompt = `# Pull Request Summary Generation

## PR Information
- **Title**: ${prData.title}
- **Description**: ${prData.description}
- **PR Number**: #${prData.prNumber}
- **Author**: ${prData.author}
${prData.metadata ? `- **Branch**: ${prData.metadata.headBranch} → ${prData.metadata.baseBranch}
- **Created**: ${prData.metadata.createdAt}` : ''}

## Repository Context
- **Primary Language**: ${prData.repoContext?.primaryLanguage || 'Unknown'}
- **Architecture**: ${prData.repoContext?.architectureStyle || 'Unknown'}
- **Frameworks**: ${prData.repoContext?.frameworks?.join(', ') || 'None detected'}

## Code Changes
\`\`\`diff
${prData.diff.substring(0, 6000)} // Truncated for analysis
\`\`\`

## Task

Generate a comprehensive yet concise summary of this Pull Request. Focus on:

1. **What was changed** (high-level overview)
2. **Why it was changed** (purpose/motivation)
3. **Key technical changes** (specific modifications)
4. **Potential impact** (how it affects the system)
5. **Risk assessment** (potential issues or concerns)
6. **Recommendations** (next steps or suggestions)

## Output Format

Respond with ONLY a valid JSON object in this exact format:

{
  "summary": "<2-3 sentence high-level summary of what this PR accomplishes>",
  "keyChanges": [
    "<specific change 1>",
    "<specific change 2>",
    "<specific change 3>"
  ],
  "technicalImpact": "<1-2 sentences about technical implications>",
  "riskAssessment": "<1-2 sentences about potential risks or concerns>",
  "recommendations": [
    "<actionable recommendation 1>",
    "<actionable recommendation 2>"
  ]
}

## Guidelines
- Keep summary concise but informative
- Focus on business value and technical impact
- Highlight any potential breaking changes
- Suggest testing approaches if relevant
- Be objective and constructive
- Use clear, non-technical language for summary
- Use technical details for keyChanges and impact`;
    console.log("🤖 Prompt prepared, length:", summaryPrompt.length);
    console.log("🤖 Calling OpenAI API...");
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a senior technical lead reviewing pull requests. Generate clear, concise summaries that help team members understand the changes and their impact. Always respond with valid JSON only."
                },
                {
                    role: "user",
                    content: summaryPrompt
                }
            ],
            temperature: 0.2, // Slightly higher for more natural language
            max_tokens: 1200,
        });
        console.log("🤖 OpenAI API response received");
        console.log("🤖 Usage:", completion.usage);
        console.log("🤖 Model:", completion.model);
        const response = completion.choices[0]?.message?.content?.trim() || '{}';
        console.log(`🤖 Raw OpenAI response (${response.length} chars):`);
        console.log(response);
        // Clean response if needed (remove markdown)
        let cleanedResponse = response;
        if (cleanedResponse.startsWith('```json')) {
            console.log("🧹 Cleaning markdown from response...");
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        console.log("🧹 Cleaned response:");
        console.log(cleanedResponse);
        console.log("📝 Parsing JSON response...");
        const parsed = JSON.parse(cleanedResponse);
        console.log("📝 Parsed JSON:");
        console.log(JSON.stringify(parsed, null, 2));
        // Validate and structure the result
        const result = {
            summary: parsed.summary || 'Summary generation failed',
            keyChanges: Array.isArray(parsed.keyChanges) ? parsed.keyChanges : ['Changes could not be analyzed'],
            technicalImpact: parsed.technicalImpact || 'Technical impact could not be assessed',
            riskAssessment: parsed.riskAssessment || 'Risk assessment unavailable',
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Manual review recommended']
        };
        console.log("✅ Final structured result:");
        console.log(JSON.stringify(result, null, 2));
        return result;
    }
    catch (error) {
        console.error(`❌ OpenAI analysis failed:`, error.name, error.message);
        console.error(`❌ OpenAI error details:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        // Return fallback summary
        const fallback = {
            summary: `Pull Request #${prData.prNumber}: ${prData.title}`,
            keyChanges: ['Automated analysis failed - manual review required'],
            technicalImpact: 'Technical impact could not be automatically assessed',
            riskAssessment: 'Manual risk assessment required',
            recommendations: ['Please review changes manually', 'Ensure adequate testing']
        };
        console.log("🔄 Returning fallback summary:");
        console.log(JSON.stringify(fallback, null, 2));
        return fallback;
    }
}
/* 💬 Post summary as comment on PR */
async function postSummaryComment(owner, repo, prNumber, summary) {
    console.log("💬 === POSTING COMMENT ===");
    const token = process.env.GITHUB_COMMENT_TOKEN;
    console.log(`🔑 GitHub token present: ${!!token}`);
    console.log(`🔑 GitHub token length: ${token ? token.length : 0}`);
    if (!token) {
        console.log("❌ GITHUB_COMMENT_TOKEN environment variable is not set");
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    const commentBody = `## 🤖 AI-Generated PR Summary

### 📋 Overview
${summary.summary}

### 🔧 Key Changes
${summary.keyChanges.map(change => `- ${change}`).join('\n')}

### ⚡ Technical Impact
${summary.technicalImpact}

### ⚠️ Risk Assessment
${summary.riskAssessment}

### 💡 Recommendations
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*This summary was automatically generated by AI. Please review the changes carefully and validate the analysis.*`;
    console.log(`💬 Comment body prepared (${commentBody.length} characters)`);
    console.log(`💬 Posting to PR #${prNumber} in ${owner}/${repo}`);
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`;
    console.log(`💬 GitHub API URL: ${url}`);
    const requestBody = JSON.stringify({ body: commentBody });
    console.log(`💬 Request body length: ${requestBody.length}`);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: requestBody,
    });
    console.log(`💬 GitHub API response status: ${response.status} ${response.statusText}`);
    console.log(`💬 Response headers:`, Object.fromEntries(response.headers.entries()));
    if (!response.ok) {
        const errorText = await response.text();
        console.log(`💬 GitHub API error response:`, errorText);
        throw new Error(`Failed to post summary comment: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const result = await response.json();
    console.log(`✅ Comment posted successfully:`, result.html_url);
    console.log(`✅ Comment ID:`, result.id);
}
/* 📡 Fetch PR diff */
async function fetchPRDiff(owner, repo, prNumber) {
    console.log("📡 === FETCHING PR DIFF ===");
    const token = process.env.GITHUB_COMMENT_TOKEN;
    console.log(`🔑 GitHub token present: ${!!token}`);
    if (!token) {
        console.log("❌ GITHUB_COMMENT_TOKEN environment variable is not set");
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    console.log(`📡 Fetching diff from: ${url}`);
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.diff",
        },
    });
    console.log(`📡 GitHub API response: ${response.status} ${response.statusText}`);
    if (!response.ok) {
        const errorText = await response.text();
        console.log(`📡 GitHub API error:`, errorText);
        throw new Error(`Failed to fetch PR diff: ${response.status} - ${errorText}`);
    }
    const diff = await response.text();
    console.log(`📡 Diff fetched successfully (${diff.length} characters)`);
    return diff;
}
/* 📋 Fetch basic repository context */
async function fetchRepositoryContext(owner, repo) {
    console.log("📋 === FETCHING REPOSITORY CONTEXT ===");
    const token = process.env.GITHUB_COMMENT_TOKEN;
    console.log(`🔑 GitHub token present: ${!!token}`);
    if (!token) {
        console.log("⚠️ No GitHub token, using minimal context");
        return {
            primaryLanguage: 'Unknown',
            architectureStyle: 'Unknown',
            frameworks: []
        };
    }
    try {
        const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
        console.log(`📋 Fetching repo data from: ${repoUrl}`);
        const response = await fetch(repoUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        console.log(`📋 Repository API response: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const repoData = await response.json();
            console.log(`📋 Repository language: ${repoData.language}`);
            console.log(`📋 Repository description: ${repoData.description}`);
            const context = {
                primaryLanguage: repoData.language || 'Unknown',
                architectureStyle: 'Web Application',
                frameworks: []
            };
            console.log("📋 Repository context created:", JSON.stringify(context, null, 2));
            return context;
        }
    }
    catch (error) {
        console.log("📦 Error fetching repo context:", error.message);
    }
    const fallbackContext = {
        primaryLanguage: 'Unknown',
        architectureStyle: 'Unknown',
        frameworks: []
    };
    console.log("📋 Using fallback context:", JSON.stringify(fallbackContext, null, 2));
    return fallbackContext;
}
//# sourceMappingURL=GptController.js.map