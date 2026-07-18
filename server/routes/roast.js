const express = require("express");
const router = express.Router();

const { GoogleGenerativeAI } = require("@google/generative-ai");

router.post("/", async (req, res) => {
  try {
    const { resume } = req.body;

    if (!resume || resume.trim().length < 200) {
      return res.status(400).json({
        success: false,
        error: "Resume must contain at least 200 characters.",
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Gemini API key not configured.",
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

👀 WHAT A RECRUITER IS ACTUALLY THINKING
- Bullet points only

🔧 HOW TO FIX IT
- Actionable improvements only

Resume:

${resume}
`;

    const genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    let result;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (error) {
        if (error.status === 503 && attempt < 3) {
          console.log(`Retry ${attempt}/3`);
          await new Promise((resolve) =>
            setTimeout(resolve, 2000)
          );
          continue;
        }

        throw error;
      }
    }

    const roast = result.response.text();

    return res.status(200).json({
      success: true,
      roast,
    });
  } catch (error) {
    console.error("Gemini Error:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Failed to generate roast. Please try again.",
    });
  }
});

module.exports = router;