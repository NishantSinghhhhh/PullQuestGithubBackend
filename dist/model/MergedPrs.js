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
// User schema
const UserSchema = new mongoose_1.Schema({
    id: { type: Number, required: true },
    login: { type: String, required: true },
    avatarUrl: { type: String, default: "" },
    htmlUrl: { type: String, default: "" },
    type: { type: String, default: "User" }
}, { _id: false });
// Awarded user schema (matches ingester)
const AwardedUserSchema = new mongoose_1.Schema({
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
// Main MergedPR schema (matching ingester function)
const MergedPRSchema = new mongoose_1.Schema({
    // Core PR fields
    prId: { type: Number, required: true, unique: true },
    prNumber: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    state: { type: String, default: "closed" },
    htmlUrl: { type: String, required: true },
    // PR author
    author: { type: UserSchema, required: true },
    // User who received bonus XP
    awardedUser: { type: AwardedUserSchema, required: true },
    // XP and bonus info
    bonusXpAwarded: { type: Number, required: true, min: 1 },
    awardedBy: { type: String, required: true },
    awardedAt: { type: Date, default: Date.now },
    // Repository info
    repository: { type: RepositorySchema, required: true },
    // Metadata
    labels: { type: [LabelSchema], default: [] },
    // PR stats
    additions: { type: Number, default: 0 },
    deletions: { type: Number, default: 0 },
    changedFiles: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    // Timestamps
    prCreatedAt: { type: Date, required: true },
    prUpdatedAt: { type: Date, required: true },
    prMergedAt: { type: Date, required: true },
    prClosedAt: { type: Date, required: false },
    // Status
    status: {
        type: String,
        default: "bonus_awarded",
        enum: ["bonus_awarded", "completed", "archived"]
    },
    merged: { type: Boolean, default: true }
}, {
    timestamps: true // This will automatically manage createdAt and updatedAt
});
// Create indexes for better query performance (matching ingester usage)
MergedPRSchema.index({ 'awardedUser.userId': 1 });
MergedPRSchema.index({ 'awardedUser.githubUsername': 1 });
MergedPRSchema.index({ 'repository.fullName': 1 });
MergedPRSchema.index({ 'author.login': 1 });
MergedPRSchema.index({ awardedAt: -1 });
MergedPRSchema.index({ prId: 1 });
MergedPRSchema.index({ bonusXpAwarded: -1 });
MergedPRSchema.index({ status: 1 });
// Compound indexes for common queries
MergedPRSchema.index({ 'awardedUser.userId': 1, status: 1 });
MergedPRSchema.index({ 'repository.fullName': 1, awardedAt: -1 });
// Model
const MergedPR = mongoose_1.default.model('MergedPR', MergedPRSchema);
exports.default = MergedPR;
//# sourceMappingURL=MergedPrs.js.map