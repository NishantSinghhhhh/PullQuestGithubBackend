"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCodeReview = void 0;
const openai_1 = require("../utils/openai");
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
//# sourceMappingURL=GptController.js.map