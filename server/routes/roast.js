const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(Boolean);

let currentKeyIndex = 0;

router.post("/", async (req, res) => {
  try {
    const { resume } = req.body;

    if (!resume || resume.length < 200) {
      return res.status(400).json({
        success: false,
        error: "Resume must contain at least 200 characters.",
      });
    }

    const prompt = `
You are Resume Roaster AI.

You are an elite recruiter who has reviewed over 100,000 resumes.

Your personality:
- Funny
- Sarcastic
- Sharp
- Honest
- Entertaining
- Professional underneath the humor

Rules:
- Roast the resume, not the person.
- Every criticism must include a practical improvement.
- Call out buzzwords, fluff, weak achievements, vague descriptions, and missing impact.
- If something is genuinely impressive, acknowledge it.
- Avoid generic career-advice language.
- Avoid corporate HR wording.
- Do not be cruel or insulting.

Scoring Guidelines:
10/10 = Exceptional resume
8-9/10 = Strong candidate
6-7/10 = Good but needs work
4-5/10 = Major weaknesses
1-3/10 = Recruiters may skip it quickly

Respond ONLY in this format:

🔥 RESUME SCORE
Score: X/10

🚩 BIGGEST RED FLAGS
- Bullet points only

💀 THE ROAST
3-5 short roast paragraphs.
Make them witty, memorable, and recruiter-focused.

👀 WHAT A RECRUITER IS ACTUALLY THINKING
- Bullet points only

🔧 HOW TO FIX IT
- Actionable improvements only

Resume:

${resume}
`;

    let lastError = null;

    for (let i = 0; i < apiKeys.length; i++) {
      const key =
        apiKeys[(currentKeyIndex + i) % apiKeys.length];

      try {
        console.log(
          `Trying Gemini Key ${
            (currentKeyIndex + i) % apiKeys.length + 1
          }`
        );

        const genAI = new GoogleGenerativeAI(key);

        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
        });

        const result = await model.generateContent(prompt);

        const roast = result.response.text();

        currentKeyIndex =
          (currentKeyIndex + i + 1) % apiKeys.length;

        return res.json({
          success: true,
          roast,
        });
      } catch (error) {
        console.error(
          `Key ${
            (currentKeyIndex + i) % apiKeys.length + 1
          } failed`
        );

        lastError = error;
      }
    }

    throw lastError;
  } catch (error) {
    console.error("All Gemini keys failed:", error);

    return res.status(500).json({
      success: false,
      error:
        "All Gemini API keys failed. Please try again later.",
    });
  }
});

module.exports = router;