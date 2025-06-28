"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
// User schema (for nested user objects)
const UserSchema = new mongoose_1.Schema({
    id: { type: Number, required: true },
    login: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    htmlUrl: { type: String, default: "" },
    type: { type: String, default: "User" }
}, { _id: false });
// Staking user schema (references our User model)
const StakingUserSchema = new mongoose_1.Schema({
    userId: { type: String, required: true }, // ObjectId reference
    githubUsername: { type: String, required: true },
    githubId: { type: Number, required: true },
    avatarUrl: { type: String, default: "" }
}, { _id: false });
// Label schema
const LabelSchema = new mongoose_1.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    color: { type: String, default: "000000" },
    description: { type: String, default: "" }
}, { _id: false });
// Milestone schema
const MilestoneSchema = new mongoose_1.Schema({
    id: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    state: { type: String, default: "open" },
    dueOn: { type: Date, required: false }
}, { _id: false });
// Repository schema
const RepositorySchema = new mongoose_1.Schema({
    id: { type: Number, required: true },
    name: { type: String, required: true },
    fullName: { type: String, required: true },
    htmlUrl: { type: String, required: true },
    language: { type: String, default: "" },
    stargazersCount: { type: Number, default: 0 },
    forksCount: { type: Number, default: 0 },
    description: { type: String, default: "" }
}, { _id: false });
// Main StakedIssue schema
const StakedIssueSchema = new mongoose_1.Schema({
    // Core issue fields
    issueId: { type: Number, required: true },
    issueNumber: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    state: { type: String, default: "open", enum: ["open", "closed"] },
    htmlUrl: { type: String, required: true },
    // Original issue creator
    issueCreator: { type: UserSchema, required: true },
    // Staking user (who staked coins)
    stakingUser: { type: StakingUserSchema, required: true },
    // Metadata
    labels: { type: [LabelSchema], default: [] },
    milestone: { type: MilestoneSchema, required: false },
    repository: { type: RepositorySchema, required: true },
    // Staking specific fields
    stakeAmount: { type: Number, required: true, min: 1 },
    stakingDate: { type: Date, default: Date.now },
    status: {
        type: String,
        default: "active",
        enum: ["active", "completed", "refunded", "expired"]
    },
    // Progress tracking
    assignedTo: { type: UserSchema, required: false },
    prNumber: { type: Number, required: false },
    prUrl: { type: String, required: false },
    // Rewards and completion
    xpReward: { type: Number, required: false },
    bountyReward: { type: Number, required: false },
    completedAt: { type: Date, required: false },
    refundedAt: { type: Date, required: false },
    // Issue metadata
    difficulty: {
        type: String,
        required: false,
        enum: ["easy", "medium", "hard", "expert"]
    },
    estimatedHours: { type: Number, required: false },
    commentsCount: { type: Number, default: 0 },
    authorAssociation: {
        type: String,
        default: "NONE",
        enum: ["COLLABORATOR", "CONTRIBUTOR", "FIRST_TIMER", "FIRST_TIME_CONTRIBUTOR", "MANNEQUIN", "MEMBER", "NONE", "OWNER"]
    },
    // Timestamps
    issueCreatedAt: { type: Date, required: true },
    issueUpdatedAt: { type: Date, required: true },
    issueClosedAt: { type: Date, required: false },
    expirationDate: { type: Date, required: false }
}, {
    timestamps: true // This will automatically manage createdAt and updatedAt for staking record
});
// Create indexes for better query performance
StakedIssueSchema.index({ 'stakingUser.userId': 1 });
StakedIssueSchema.index({ 'stakingUser.githubUsername': 1 });
StakedIssueSchema.index({ 'repository.fullName': 1 });
StakedIssueSchema.index({ status: 1 });
StakedIssueSchema.index({ stakingDate: -1 });
StakedIssueSchema.index({ issueId: 1 });
StakedIssueSchema.index({ stakeAmount: -1 });
// Compound indexes for common queries
StakedIssueSchema.index({ 'stakingUser.userId': 1, status: 1 });
StakedIssueSchema.index({ 'repository.fullName': 1, status: 1 });
// Model
const StakedIssue = mongoose_1.default.model('StakedIssue', StakedIssueSchema);
exports.default = StakedIssue;
//# sourceMappingURL=StakedIssue.js.map