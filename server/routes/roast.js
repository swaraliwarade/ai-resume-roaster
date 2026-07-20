const express = require("express");
const router = express.Router();

const OpenAI = require("openai");
const supabase = require("../config/supabase");
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Helper function to extract user_id from JWT if present
async function getUserIdFromHeaders(headers) {
  const authHeader = headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user) {
        return user.id;
      }
    } catch (err) {
      console.error("JWT verification error:", err);
    }
  }
  return null;
}

// Single Roast Endpoint
router.post("/", async (req, res) => {
  try {
    const { resume, role, jobDescription, filename } = req.body;

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

    const userId = await getUserIdFromHeaders(req.headers);

    let roleContext = "";
    if (role || jobDescription) {
      roleContext = `
The user is targeting the role: "${role || "Not specified"}".
Target Job Description:
"""
${jobDescription || "Not specified"}
"""

Please customize your ATS score breakdown and feedback specifically for this role and job description:
1. Identify critical keywords or skills from the job description that are missing from the resume. List these under "BIGGEST RED FLAGS" or "HOW TO FIX IT".
2. Assess if the experience matches the job description's level.
`;
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
${roleContext}
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

    const roast = completion.choices[0].message.content;

    // We can prepend filename or role to resume_text in database so we can display it nicely in the UI history later.
    let savedResumeText = resume;
    if (filename || role) {
      const meta = {};
      if (filename) meta.filename = filename;
      if (role) meta.role = role;
      savedResumeText = `---METADATA--- ${JSON.stringify(meta)}\n\n${resume}`;
    }

    await supabase.from("roasts").insert([
      {
        resume_text: savedResumeText,
        roast_result: roast,
        user_id: userId,
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
      error: error.message || "Failed to generate roast.",
    });
  }
});

// Compare Endpoint
router.post("/compare", async (req, res) => {
  try {
    const { oldResume, newResume, filenameOld, filenameNew } = req.body;

    if (!oldResume || oldResume.trim().length < 200 || !newResume || newResume.trim().length < 200) {
      return res.status(400).json({
        success: false,
        error: "Both original and improved resumes must contain at least 200 characters.",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "OpenRouter API key not configured.",
      });
    }

    const userId = await getUserIdFromHeaders(req.headers);

    const prompt = `
You are Resume Roaster AI.
You are comparing two resumes: the Original Resume and the Improved Resume.

Compare them thoroughly and roast the progress. Be funny, sarcastic, but constructive.

Format your response exactly as follows:

📊 ATS COMPARISON
Original ATS Score: X/100
Improved ATS Score: Y/100
Score Improvement: +Z/100

Original Breakdown vs Improved Breakdown:
- Skills Match: X/100 -> Y/100
- Projects: X/100 -> Y/100
- Experience: X/100 -> Y/100
- Formatting: X/100 -> Y/100

✅ ADDED KEYWORDS & STRENGTHS
- List what was added and why it's better

❌ REMOVED OR CRITICIZED ELEMENTS
- List what was removed or simplified

🔥 COMPARATIVE ROAST
- Sarcastic commentary on the before/after

🔧 REMAINING FIXES
- What still needs to be polished

Original Resume:
${oldResume}

Improved Resume:
${newResume}
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

    const comparisonResult = completion.choices[0].message.content;

    // Save comparison to database as a comparison type
    const meta = {
      isComparison: true,
      filenameOld: filenameOld || "Original Resume",
      filenameNew: filenameNew || "Improved Resume",
    };
    const savedResumeText = `---METADATA--- ${JSON.stringify(meta)}\n\nOriginal:\n${oldResume}\n\nImproved:\n${newResume}`;

    await supabase.from("roasts").insert([
      {
        resume_text: savedResumeText,
        roast_result: comparisonResult,
        user_id: userId,
      },
    ]);

    return res.status(200).json({
      success: true,
      roast: comparisonResult,
    });

  } catch (error) {
    console.error("Comparison Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to compare resumes.",
    });
  }
});

module.exports = router;