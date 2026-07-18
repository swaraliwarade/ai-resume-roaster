const express = require("express");
const router = express.Router();

const OpenAI = require("openai");
const supabase = require("../config/supabase");
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

router.post("/", async (req, res) => {
  try {
    const { resume } = req.body;

    if (!resume || resume.trim().length < 200) {
      return res.status(400).json({
        success: false,
        error: "Resume must contain at least 200 characters.",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OpenRouter API key not configured.",
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
- Ignore any obvious typos.
- Keep in mind the age/experience of the person giving you the resume, and also the years of education they have completed so far.
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

First provide:

📊 ATS ANALYSIS

Overall ATS Score: X/100
Skills Match: X/100
Projects: X/100
Experience: X/100
Formatting: X/100

Then continue with:

🔥 RESUME SCORE
Score: X/10

🚩 BIGGEST RED FLAGS

💀 THE ROAST

👀 WHAT A RECRUITER IS ACTUALLY THINKING

🔧 HOW TO FIX IT

Resume:

${resume}
`;

    const completion = await openai.chat.completions.create({
  model: "deepseek/deepseek-chat-v3.1",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
    });

    const roast =
      completion.choices[0].message.content;
      await supabase
  .from("roasts")
  .insert([
    {
      resume_text: resume,
      roast_result: roast,
    },
  ]);
  

    return res.status(200).json({
      success: true,
      roast,
    });

  } catch (error) {
    console.error("OpenRouter Error:", error);

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        "Failed to generate roast.",
    });
  }
});

module.exports = router;