"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleIssueAnalysis = void 0;
const openai_1 = __importDefault(require("openai"));
const handleIssueAnalysis = async (req, res) => {
    console.log("🔍 Starting comprehensive AI-powered issue analysis");
    const { owner, repo, issueNumber, openaiApiKey, addLabelsToPRs = true } = req.body;
    if (!owner || !repo || !issueNumber || !openaiApiKey) {
        res.status(400).json({ error: "owner, repo, issueNumber, and openaiApiKey are required" });
        return;
    }
    try {
        console.log(`🎯 Analyzing issue #${issueNumber} in ${owner}/${repo}`);
        console.log(`🏷️ Add labels to PRs: ${addLabelsToPRs}`);
        /* 1️⃣ Initialize OpenAI client */
        const openai = new openai_1.default({ apiKey: openaiApiKey });
        /* 2️⃣ Fetch repository context for design patterns */
        const repoContext = await fetchRepositoryContext(owner, repo);
        console.log("📋 Repository context:", JSON.stringify(repoContext, null, 2));
        /* 3️⃣ Fetch all PRs connected to this issue */
        const connectedPRs = await fetchConnectedPRs(owner, repo, issueNumber);
        if (connectedPRs.length === 0) {
            console.log("ℹ️ No PRs found connected to this issue");
            res.status(200).json({
                message: "No PRs connected to this issue",
                issueNumber,
                totalPRs: 0
            });
            return;
        }
        console.log(`📋 Found ${connectedPRs.length} PRs connected to issue #${issueNumber}`);
        /* 4️⃣ Analyze each PR using OpenAI */
        const prAnalyses = [];
        for (const pr of connectedPRs) {
            console.log(`\n🤖 AI analyzing PR #${pr.number}: "${pr.title}"`);
            try {
                const diff = await fetchPRDiff(owner, repo, pr.number);
                const aiAnalysis = await analyzeWithOpenAI(openai, pr, diff, repoContext);
                const analysis = {
                    prNumber: pr.number,
                    title: pr.title,
                    author: pr.user.login,
                    createdAt: pr.created_at,
                    state: pr.state,
                    aiAnalysis,
                    overallScore: Math.round((aiAnalysis.designPatternScore + aiAnalysis.codeQualityScore + aiAnalysis.priorityScore) / 3)
                };
                prAnalyses.push(analysis);
                console.log(`✅ Completed AI analysis for PR #${pr.number} (Overall Score: ${analysis.overallScore})`);
            }
            catch (error) {
                console.error(`❌ Failed to analyze PR #${pr.number}:`, error.message);
            }
        }
        /* 5️⃣ Calculate priority assignments and determine labels */
        const analysisResult = calculateIssueMetrics(issueNumber, prAnalyses);
        /* 6️⃣ Apply labels to the issue */
        await applyLabelsToIssue(owner, repo, issueNumber, analysisResult.recommendedLabels);
        /* 7️⃣ Optionally apply priority labels to individual PRs */
        if (addLabelsToPRs) {
            await applyPriorityLabelsToPRs(owner, repo, analysisResult.priorityAssignments, prAnalyses);
        }
        /* 8️⃣ Return comprehensive results */
        const response = {
            success: true,
            ...analysisResult,
            repositoryContext: repoContext,
            labelsAppliedToPRs: addLabelsToPRs,
            message: `Successfully analyzed ${prAnalyses.length} PRs for issue #${issueNumber} using AI`
        };
        console.log("🎯 AI Analysis complete");
        res.status(200).json(response);
    }
    catch (err) {
        console.error("❌ Issue analysis failed:", err);
        res.status(500).json({ error: "Issue analysis failed: " + err.message });
    }
};
exports.handleIssueAnalysis = handleIssueAnalysis;
/* 📋 Fetch repository context to understand design patterns */
async function fetchRepositoryContext(owner, repo) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    try {
        // Fetch repository details
        const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const repoResponse = await fetch(repoUrl, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        if (!repoResponse.ok) {
            throw new Error(`Failed to fetch repo details: ${repoResponse.status}`);
        }
        const repoData = await repoResponse.json();
        // Fetch package.json or equivalent to understand frameworks
        const packageJsonUrl = `https://api.github.com/repos/${owner}/${repo}/contents/package.json`;
        let frameworks = [];
        try {
            const packageResponse = await fetch(packageJsonUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (packageResponse.ok) {
                const packageData = await packageResponse.json();
                const packageContent = JSON.parse(Buffer.from(packageData.content, 'base64').toString());
                // Extract frameworks from dependencies
                const deps = { ...packageContent.dependencies, ...packageContent.devDependencies };
                frameworks = Object.keys(deps).filter(dep => ['react', 'angular', 'vue', 'express', 'fastify', 'next', 'nuxt', 'nest'].some(framework => dep.toLowerCase().includes(framework)));
            }
        }
        catch (error) {
            console.log("📦 Could not fetch package.json, using defaults");
        }
        return {
            designPatterns: inferDesignPatterns(repoData.language, frameworks),
            codeQualityStandards: inferQualityStandards(repoData.language),
            architectureStyle: inferArchitectureStyle(frameworks),
            primaryLanguage: repoData.language || 'Unknown',
            frameworks
        };
    }
    catch (error) {
        console.error("⚠️ Failed to fetch full repository context:", error.message);
        // Return basic context as fallback
        return {
            designPatterns: ['MVC', 'Repository', 'Factory'],
            codeQualityStandards: ['Clean Code', 'SOLID Principles'],
            architectureStyle: 'Modular',
            primaryLanguage: 'Unknown',
            frameworks: []
        };
    }
}
/* 🧠 Infer likely design patterns based on language and frameworks */
function inferDesignPatterns(language, frameworks) {
    const patterns = ['Repository', 'Factory', 'Observer'];
    if (language === 'JavaScript' || language === 'TypeScript') {
        patterns.push('Module', 'Singleton', 'Strategy');
        if (frameworks.some(f => f.includes('react'))) {
            patterns.push('Component', 'HOC', 'Render Props', 'Custom Hooks');
        }
        if (frameworks.some(f => f.includes('express'))) {
            patterns.push('MVC', 'Middleware', 'Router');
        }
    }
    if (language === 'Java') {
        patterns.push('MVC', 'DAO', 'Builder', 'Adapter');
    }
    if (language === 'Python') {
        patterns.push('Django MVT', 'Decorator', 'Context Manager');
    }
    return patterns;
}
function inferQualityStandards(language) {
    const standards = ['Clean Code', 'SOLID Principles', 'DRY'];
    if (language === 'JavaScript' || language === 'TypeScript') {
        standards.push('ESLint Standards', 'Type Safety', 'Modern ES6+');
    }
    return standards;
}
function inferArchitectureStyle(frameworks) {
    if (frameworks.some(f => f.includes('micro')))
        return 'Microservices';
    if (frameworks.some(f => f.includes('react') || f.includes('vue')))
        return 'Component-Based';
    if (frameworks.some(f => f.includes('express')))
        return 'RESTful API';
    return 'Modular Monolith';
}
/* 🤖 Analyze PR using OpenAI with comprehensive prompt */
async function analyzeWithOpenAI(openai, pr, diff, repoContext) {
    const analysisPrompt = `# Comprehensive Pull Request Analysis

## Repository Context
- **Primary Language**: ${repoContext.primaryLanguage}
- **Architecture Style**: ${repoContext.architectureStyle}
- **Expected Design Patterns**: ${repoContext.designPatterns.join(', ')}
- **Code Quality Standards**: ${repoContext.codeQualityStandards.join(', ')}
- **Frameworks Used**: ${repoContext.frameworks.join(', ') || 'None specified'}

## Pull Request Details
- **Title**: ${pr.title}
- **Author**: ${pr.user.login}
- **State**: ${pr.state}
- **Description**: ${pr.body || 'No description provided'}

## Code Changes
\`\`\`diff
${diff.substring(0, 8000)} // Truncated for analysis
\`\`\`

## Analysis Requirements

Please provide a comprehensive analysis and scoring for this PR across three dimensions:

### 1. Design Pattern Adherence (Score: 0-100)
- Does the code follow the expected design patterns for this repository?
- Are the design patterns implemented correctly and consistently?
- Does the code structure align with the repository's architectural style?
- Are there any violations or anti-patterns present?

### 2. Code Quality Assessment (Score: 0-100)
- **Readability**: Is the code well-structured and easy to understand?
- **Maintainability**: How easy would it be to modify or extend this code?
- **Performance**: Are there any obvious performance issues or optimizations?
- **Security**: Are there potential security vulnerabilities?
- **Testing**: Is the code testable and are tests included?
- **Documentation**: Are comments and documentation adequate?

### 3. Priority Scoring (Score: 0-100)
- **Impact**: How significant is this change to the overall system?
- **Risk**: How likely is this change to introduce bugs or break existing functionality?
- **Complexity**: How complex is this implementation?
- **Best Practices**: How well does this follow industry best practices?
- **Innovation**: Does this introduce valuable improvements or optimizations?

## Output Format

Respond with ONLY a valid JSON object in this exact format:

{
  "designPatternScore": <number 0-100>,
  "codeQualityScore": <number 0-100>,
  "priorityScore": <number 0-100>,
  "designPatternFollowed": <boolean>,
  "analysisReason": "<concise 2-3 sentence explanation of overall assessment>",
  "recommendations": [
    "<specific actionable recommendation 1>",
    "<specific actionable recommendation 2>",
    "<specific actionable recommendation 3>"
  ],
  "detailedAnalysis": "<comprehensive 4-6 sentence analysis covering all three scoring dimensions>"
}

## Scoring Guidelines
- **90-100**: Exceptional - Sets a new standard
- **80-89**: Excellent - Exceeds expectations
- **70-79**: Good - Meets standards with some improvements
- **60-69**: Fair - Acceptable but needs improvement
- **50-59**: Poor - Below standards, requires significant changes
- **0-49**: Unacceptable - Major issues that must be addressed

Focus on providing accurate, actionable feedback that will help improve code quality and maintainability.`;
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a senior software engineer and code review expert. Analyze pull requests thoroughly and provide accurate scoring based on design patterns, code quality, and priority. Always respond with valid JSON only."
                },
                {
                    role: "user",
                    content: analysisPrompt
                }
            ],
            temperature: 0.1, // Low temperature for consistent analysis
            max_tokens: 1500,
        });
        const response = completion.choices[0]?.message?.content?.trim() || '{}';
        console.log(`🤖 OpenAI response for PR #${pr.number}:`, response.substring(0, 200) + "...");
        // Clean response if needed (remove markdown)
        let cleanedResponse = response;
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        }
        const parsed = JSON.parse(cleanedResponse);
        // Validate required fields
        const result = {
            designPatternScore: Math.max(0, Math.min(100, parsed.designPatternScore || 0)),
            codeQualityScore: Math.max(0, Math.min(100, parsed.codeQualityScore || 0)),
            priorityScore: Math.max(0, Math.min(100, parsed.priorityScore || 0)),
            designPatternFollowed: parsed.designPatternFollowed || false,
            analysisReason: parsed.analysisReason || 'Analysis completed',
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
            detailedAnalysis: parsed.detailedAnalysis || 'Detailed analysis not available'
        };
        return result;
    }
    catch (error) {
        console.error(`❌ OpenAI analysis failed for PR #${pr.number}:`, error.message);
        // Return default analysis on failure
        return {
            designPatternScore: 50,
            codeQualityScore: 50,
            priorityScore: 50,
            designPatternFollowed: false,
            analysisReason: 'Analysis failed - manual review required',
            recommendations: ['Manual code review needed', 'Check for compilation errors', 'Verify functionality'],
            detailedAnalysis: 'Automated analysis could not be completed due to technical issues.'
        };
    }
}
/* 📊 Calculate metrics and priority assignments based on AI analysis */
function calculateIssueMetrics(issueNumber, prAnalyses) {
    // Sort PRs by overall score (highest first)
    const sortedPRs = [...prAnalyses].sort((a, b) => b.overallScore - a.overallScore);
    // Assign priorities based on AI scoring
    const priorityAssignments = {
        priority1: sortedPRs.slice(0, 1).map(pr => pr.prNumber),
        priority2: sortedPRs.slice(1, 2).map(pr => pr.prNumber),
        priority3: sortedPRs.slice(2, 3).map(pr => pr.prNumber),
        priority4: sortedPRs.slice(3).map(pr => pr.prNumber)
    };
    // Determine design pattern compliance based on AI analysis
    const followedCount = prAnalyses.filter(pr => pr.aiAnalysis.designPatternFollowed).length;
    const totalCount = prAnalyses.length;
    let designPatternCompliance;
    const compliancePercentage = (followedCount / totalCount) * 100;
    if (compliancePercentage >= 70) {
        designPatternCompliance = 'followed';
    }
    else {
        designPatternCompliance = 'not_followed';
    }
    // Calculate overall issue priority based on highest scoring PR
    const highestScore = sortedPRs.length > 0 ? sortedPRs[0].overallScore : 0;
    let issuePriority;
    if (highestScore >= 80) {
        issuePriority = 'Priority-1';
    }
    else if (highestScore >= 60) {
        issuePriority = 'Priority-2';
    }
    else if (highestScore >= 40) {
        issuePriority = 'Priority-3';
    }
    else {
        issuePriority = 'Priority-4';
    }
    // Generate recommended labels for the ISSUE (only ONE priority label)
    const recommendedLabels = [];
    // Add single priority label for the issue
    recommendedLabels.push(issuePriority);
    // Add design pattern compliance
    if (designPatternCompliance === 'followed') {
        recommendedLabels.push('Design Pattern Followed');
    }
    else {
        recommendedLabels.push('Design Pattern Not Followed');
    }
    return {
        issueNumber,
        totalPRs: prAnalyses.length,
        analyzedPRs: sortedPRs,
        issuePriority, // Single priority for the issue
        priorityAssignments, // Individual PR priorities (for PR labeling)
        designPatternCompliance,
        compliancePercentage: Math.round(compliancePercentage),
        recommendedLabels, // Only contains ONE priority + design pattern label
        aiInsights: {
            averageDesignPatternScore: Math.round(prAnalyses.reduce((sum, pr) => sum + pr.aiAnalysis.designPatternScore, 0) / prAnalyses.length),
            averageCodeQualityScore: Math.round(prAnalyses.reduce((sum, pr) => sum + pr.aiAnalysis.codeQualityScore, 0) / prAnalyses.length),
            averagePriorityScore: Math.round(prAnalyses.reduce((sum, pr) => sum + pr.aiAnalysis.priorityScore, 0) / prAnalyses.length),
            highestPRScore: highestScore
        }
    };
}
// Previous helper functions remain the same...
async function fetchConnectedPRs(owner, repo, issueNumber) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    const searchUrl = `https://api.github.com/search/issues?q=repo:${owner}/${repo}+type:pr+${issueNumber}`;
    console.log(`📡 Searching for PRs: ${searchUrl}`);
    const response = await fetch(searchUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to search PRs: ${response.status} ${response.statusText} - ${errorText}`);
    }
    const searchResults = await response.json();
    const connectedPRs = [];
    for (const item of searchResults.items) {
        if (item.pull_request && referencesIssue(item.title + ' ' + (item.body || ''), issueNumber)) {
            const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${item.number}`;
            const prResponse = await fetch(prUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (prResponse.ok) {
                const prData = await prResponse.json();
                connectedPRs.push(prData);
            }
        }
    }
    return connectedPRs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
function referencesIssue(text, issueNumber) {
    const patterns = [
        new RegExp(`(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved)\\s+#${issueNumber}`, 'i'),
        new RegExp(`(?:relates?|related)\\s+(?:to\\s+)?#${issueNumber}`, 'i'),
        new RegExp(`(?:addresses?|addressing)\\s+#${issueNumber}`, 'i'),
        new RegExp(`issue\\s*#${issueNumber}`, 'i'),
        new RegExp(`#${issueNumber}(?!\\d)`, 'g')
    ];
    return patterns.some(pattern => pattern.test(text));
}
async function fetchPRDiff(owner, repo, prNumber) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3.diff",
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to fetch PR diff: ${response.status}`);
    }
    return await response.text();
}
async function applyLabelsToIssue(owner, repo, issueNumber, labels) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    console.log(`🏷️ Applying AI-analyzed labels to issue #${issueNumber}:`, labels);
    const getCurrentLabelsUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`;
    const currentResponse = await fetch(getCurrentLabelsUrl, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
        },
    });
    if (!currentResponse.ok) {
        throw new Error(`Failed to get current labels: ${currentResponse.status}`);
    }
    const currentLabels = await currentResponse.json();
    const currentLabelNames = currentLabels.map((label) => label.name);
    const labelsToRemove = currentLabelNames.filter((name) => name.startsWith('Priority-') ||
        name === 'Design Pattern Followed' ||
        name === 'Design Pattern Not Followed');
    const otherLabels = currentLabelNames.filter((name) => !labelsToRemove.includes(name));
    const updatedLabels = [...otherLabels, ...labels];
    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`;
    const response = await fetch(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedLabels),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to apply labels: ${response.status} ${response.statusText} - ${errorText}`);
    }
    console.log(`✅ Successfully applied AI-analyzed labels to issue #${issueNumber}`);
}
/* 🏷️ Apply priority labels to individual PRs based on AI analysis */
async function applyPriorityLabelsToPRs(owner, repo, priorityAssignments, prAnalyses) {
    const token = process.env.GITHUB_COMMENT_TOKEN;
    if (!token) {
        throw new Error("GITHUB_COMMENT_TOKEN environment variable is not set");
    }
    console.log("🏷️ Applying priority labels to individual PRs...");
    // Create a map of PR numbers to their priority and design pattern status
    const prLabelMap = new Map();
    // Add priority labels
    priorityAssignments.priority1.forEach((prNum) => {
        if (!prLabelMap.has(prNum))
            prLabelMap.set(prNum, []);
        prLabelMap.get(prNum).push('Priority-1');
    });
    priorityAssignments.priority2.forEach((prNum) => {
        if (!prLabelMap.has(prNum))
            prLabelMap.set(prNum, []);
        prLabelMap.get(prNum).push('Priority-2');
    });
    priorityAssignments.priority3.forEach((prNum) => {
        if (!prLabelMap.has(prNum))
            prLabelMap.set(prNum, []);
        prLabelMap.get(prNum).push('Priority-3');
    });
    priorityAssignments.priority4.forEach((prNum) => {
        if (!prLabelMap.has(prNum))
            prLabelMap.set(prNum, []);
        prLabelMap.get(prNum).push('Priority-4');
    });
    // Add design pattern compliance labels to each PR
    for (const analysis of prAnalyses) {
        if (!prLabelMap.has(analysis.prNumber)) {
            prLabelMap.set(analysis.prNumber, []);
        }
        if (analysis.aiAnalysis.designPatternFollowed) {
            prLabelMap.get(analysis.prNumber).push('Design Pattern Followed');
        }
        else {
            prLabelMap.get(analysis.prNumber).push('Design Pattern Not Followed');
        }
    }
    // Apply labels to each PR
    for (const [prNumber, labelsToAdd] of prLabelMap) {
        try {
            console.log(`🏷️ Adding labels to PR #${prNumber}:`, labelsToAdd);
            // Get current PR labels
            const getCurrentLabelsUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/labels`;
            const currentResponse = await fetch(getCurrentLabelsUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });
            if (!currentResponse.ok) {
                console.error(`❌ Failed to get current labels for PR #${prNumber}: ${currentResponse.status}`);
                continue;
            }
            const currentLabels = await currentResponse.json();
            const currentLabelNames = currentLabels.map((label) => label.name);
            // Remove old priority and design pattern labels
            const labelsToRemove = currentLabelNames.filter((name) => name.startsWith('Priority-') ||
                name === 'Design Pattern Followed' ||
                name === 'Design Pattern Not Followed');
            const otherLabels = currentLabelNames.filter((name) => !labelsToRemove.includes(name));
            // Combine with new labels
            const updatedLabels = [...otherLabels, ...labelsToAdd];
            // Apply labels to PR
            const url = `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/labels`;
            const response = await fetch(url, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedLabels),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ Failed to apply labels to PR #${prNumber}: ${response.status} ${response.statusText} - ${errorText}`);
                continue;
            }
            console.log(`✅ Successfully applied labels to PR #${prNumber}: ${labelsToAdd.join(', ')}`);
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        catch (error) {
            console.error(`❌ Error applying labels to PR #${prNumber}:`, error.message);
        }
    }
    console.log("✅ Completed applying priority labels to all PRs");
}
//# sourceMappingURL=LabelController.js.map