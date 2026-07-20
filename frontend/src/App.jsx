import { roastResume, compareResumes } from "./api";
import { useState, useEffect } from "react";
import { getRoastHistory } from "./services/history";
import { supabase } from "./services/supabase";

// Local PDF upload helper
const uploadResume = async (file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await fetch("http://localhost:8000/api/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to upload file");
  }
  return data.text;
};

// ATS Score circular ring progress component
function CircularGauge({ score, title, size = "large" }) {
  const isLarge = size === "large";
  const radius = isLarge ? 48 : 36;
  const strokeWidth = isLarge ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  // Determine color based on score
  let strokeColor = "#ef4444"; // Red (<50)
  if (safeScore >= 80) {
    strokeColor = "#10b981"; // Green (80+)
  } else if (safeScore >= 50) {
    strokeColor = "#f97316"; // Orange (50-79)
  }

  const dimensions = isLarge ? "w-32 h-32" : "w-24 h-24";
  const textClass = isLarge ? "text-2xl font-bold" : "text-lg font-bold";

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
      <div className={`relative ${dimensions} flex items-center justify-center`}>
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={isLarge ? "64" : "48"}
            cy={isLarge ? "64" : "48"}
            r={radius}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={isLarge ? "64" : "48"}
            cy={isLarge ? "64" : "48"}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s ease-in-out",
            }}
          />
        </svg>
        <div className="absolute text-center">
          <span className={textClass}>{safeScore}</span>
          <span className="text-xs text-slate-400 block">%</span>
        </div>
      </div>
      <p className="mt-2 text-xs font-semibold tracking-wide text-slate-300 text-center uppercase">
        {title}
      </p>
    </div>
  );
}

// Helper to parse ATS scores out of AI response markdown
function parseAtsScores(text) {
  if (!text) return null;
  const scores = {};

  const overallMatch = text.match(/Overall ATS Score:\s*(\d+)/i);
  const skillsMatch = text.match(/Skills Match:\s*(\d+)/i);
  const projectsMatch = text.match(/Projects:\s*(\d+)/i);
  const experienceMatch = text.match(/Experience:\s*(\d+)/i);
  const formattingMatch = text.match(/Formatting:\s*(\d+)/i);

  if (overallMatch) scores.overall = parseInt(overallMatch[1], 10);
  if (skillsMatch) scores.skills = parseInt(skillsMatch[1], 10);
  if (projectsMatch) scores.projects = parseInt(projectsMatch[1], 10);
  if (experienceMatch) scores.experience = parseInt(experienceMatch[1], 10);
  if (formattingMatch) scores.formatting = parseInt(formattingMatch[1], 10);

  // Fallback: search for Score: X/10
  const resumeScoreMatch = text.match(/(?:Resume Score|Score):\s*([\d.]+)\/10/i);
  if (resumeScoreMatch && !scores.overall) {
    scores.overall = Math.round(parseFloat(resumeScoreMatch[1]) * 10);
  }

  // Check for comparison scores
  const origMatch = text.match(/Original ATS Score:\s*(\d+)/i);
  const impMatch = text.match(/Improved ATS Score:\s*(\d+)/i);
  if (origMatch) scores.original = parseInt(origMatch[1], 10);
  if (impMatch) scores.improved = parseInt(impMatch[1], 10);

  if (Object.keys(scores).length === 0) return null;
  return scores;
}

// Helper to clean and format output sections
function formatRoastSections(text) {
  if (!text) return [];

  // Match the major headers and split
  const headers = [
    { title: "📊 ATS Analysis", key: "ATS ANALYSIS" },
    { title: "📊 ATS Comparison", key: "ATS COMPARISON" },
    { title: "🔥 Resume Score", key: "RESUME SCORE" },
    { title: "🚩 Biggest Red Flags", key: "BIGGEST RED FLAGS" },
    { title: "💀 The Roast", key: "THE ROAST" },
    { title: "👀 What a Recruiter is Thinking", key: "WHAT A RECRUITER IS ACTUALLY THINKING" },
    { title: "🔧 How to Fix It", key: "HOW TO FIX IT" },
    { title: "✅ Added Keywords & Strengths", key: "ADDED KEYWORDS" },
    { title: "❌ Removed or Criticized Elements", key: "REMOVED OR CRITICIZED ELEMENTS" },
    { title: "🔥 Comparative Roast", key: "COMPARATIVE ROAST" },
    { title: "🔧 Remaining Fixes", key: "REMAINING FIXES" },
  ];

  let formatted = [];
  let lastIndex = 0;

  // Simple sorting of headers based on where they appear
  const foundHeaders = [];
  headers.forEach((h) => {
    // Escape markdown markers when matching
    const regex = new RegExp(`(?:[#*\\s]*)${h.key}`, "i");
    const match = text.search(regex);
    if (match !== -1) {
      foundHeaders.push({ ...h, index: match });
    }
  });

  foundHeaders.sort((a, b) => a.index - b.index);

  for (let i = 0; i < foundHeaders.length; i++) {
    const current = foundHeaders[i];
    const next = foundHeaders[i + 1];
    const startIndex = text.indexOf(current.key, current.index);
    const endIndex = next ? next.index : text.length;

    let content = text.substring(startIndex + current.key.length, endIndex).trim();
    // Strip leading colons or stars
    content = content.replace(/^[:\s*-]+/g, "");

    formatted.push({
      title: current.title,
      content: content,
    });
  }

  // If no sections matched, return raw body
  if (formatted.length === 0) {
    return [{ title: "AI Feedback", content: text }];
  }

  return formatted;
}

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState("roast"); // 'roast' | 'compare'

  // Input states - Single Roast / Keywords
  const [resume, setResume] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState("");

  // Input states - Comparison
  const [resumeOld, setResumeOld] = useState("");
  const [resumeNew, setResumeNew] = useState("");
  const [fileNameOld, setFileNameOld] = useState("");
  const [fileNameNew, setFileNameNew] = useState("");

  // Loading & Results
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [result, setResult] = useState("");
  const [parsedScores, setParsedScores] = useState(null);

  // History & Sidebar
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authentication State
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const MIN_LENGTH = 200;

  const loadingMessages = [
    "Reading your resume...",
    "Consulting recruiters...",
    "Finding buzzwords...",
    "Preparing emotional damage...",
    "Checking if recruiters will survive this...",
    "Roasting achievements...",
    "Summoning hiring managers...",
    "Looking for actual impact...",
    "Almost ready to roast...",
  ];

  // Auth Hook
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // History Hook
  useEffect(() => {
    loadHistory();
  }, [user]);

  async function loadHistory() {
    try {
      const data = await getRoastHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to load roast history:", error);
    }
  }

  const handleFileUpload = async (e, type = "single") => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await uploadResume(file);

      if (type === "single") {
        setResume(text);
        setFileName(file.name);
      } else if (type === "old") {
        setResumeOld(text);
        setFileNameOld(file.name);
      } else if (type === "new") {
        setResumeNew(text);
        setFileNameNew(file.name);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error?.message || "Failed to extract PDF text.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        alert("Check your email for confirmation link!");
      }
      setAuthModalOpen(false);
      setAuthEmail("");
      setAuthPassword("");
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("Logged out successfully");
  };

  const handleSingleRoast = async () => {
    if (resume.length < MIN_LENGTH) return;

    setLoading(true);
    setResult("");
    setParsedScores(null);
    setLoadingText(
      loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
    );

    try {
      const data = await roastResume(resume, role, jobDescription, fileName);
      if (data.success) {
        setResult(data.roast);
        setParsedScores(parseAtsScores(data.roast));
        await loadHistory();
      } else {
        setResult("🔥 The AI got roasted before your resume did.");
      }
    } catch (error) {
      console.error(error);
      setResult("🔥 Something went wrong while roasting your resume.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompareRoast = async () => {
    if (resumeOld.length < MIN_LENGTH || resumeNew.length < MIN_LENGTH) return;

    setLoading(true);
    setResult("");
    setParsedScores(null);
    setLoadingText("Comparing resumes side-by-side...");

    try {
      const data = await compareResumes(
        resumeOld,
        resumeNew,
        fileNameOld,
        fileNameNew
      );
      if (data.success) {
        setResult(data.roast);
        setParsedScores(parseAtsScores(data.roast));
        await loadHistory();
      } else {
        setResult("🔥 Failed to compare the resumes.");
      }
    } catch (error) {
      console.error(error);
      setResult("🔥 Something went wrong while comparing your resumes.");
    } finally {
      setLoading(false);
    }
  };

  // Reopen a historic roast
  const handleReopenRoast = (item) => {
    let resumeText = item.resume_text;
    let meta = {};

    if (item.resume_text.startsWith("---METADATA---")) {
      const parts = item.resume_text.split("\n\n");
      const metaLine = parts[0].replace("---METADATA---", "").trim();
      try {
        meta = JSON.parse(metaLine);
        resumeText = parts.slice(1).join("\n\n");
      } catch (e) {
        console.error("Failed to parse metadata", e);
      }
    }

    if (meta.isComparison) {
      setActiveTab("compare");
      const splitResumes = resumeText.split("\n\nImproved:\n");
      const oldResPart = splitResumes[0].replace("Original:\n", "");
      const newResPart = splitResumes[1] || "";
      setResumeOld(oldResPart);
      setResumeNew(newResPart);
      setFileNameOld(meta.filenameOld || "Original Resume");
      setFileNameNew(meta.filenameNew || "Improved Resume");
    } else {
      setActiveTab("roast");
      setResume(resumeText);
      setRole(meta.role || "");
      setJobDescription("");
      setFileName(meta.filename || "Uploaded Resume");
    }

    setResult(item.roast_result);
    setParsedScores(parseAtsScores(item.roast_result));
    setSidebarOpen(false);
  };

  const parsedSections = formatRoastSections(result);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden font-sans">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-orange-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* HEADER NAVBAR */}
      <header className="relative border-b border-white/5 bg-slate-950/60 backdrop-blur-md z-30 sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🔥</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-orange-500">
                Resume Roaster
              </h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                AI Powered Recruitment Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Nav links */}
            <div className="bg-slate-900 border border-white/10 rounded-xl p-1 hidden sm:flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveTab("roast");
                  setResult("");
                  setParsedScores(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "roast"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Single Roast
              </button>
              <button
                onClick={() => {
                  setActiveTab("compare");
                  setResult("");
                  setParsedScores(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "compare"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Compare Resumes
              </button>
            </div>

            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm flex items-center gap-2"
            >
              🕒 History ({history.length})
            </button>

            {/* Authentication UI */}
            {user ? (
              <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                <span className="text-xs text-slate-300 hidden md:inline max-w-[150px] truncate">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-90 rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/25"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE NAV (Bottom Bar) */}
      <div className="sm:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-white/10 backdrop-blur-md rounded-2xl p-1.5 shadow-2xl flex gap-1 z-30">
        <button
          onClick={() => {
            setActiveTab("roast");
            setResult("");
            setParsedScores(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "roast"
              ? "bg-purple-600 text-white"
              : "text-slate-400"
          }`}
        >
          Single Roast
        </button>
        <button
          onClick={() => {
            setActiveTab("compare");
            setResult("");
            setParsedScores(null);
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "compare"
              ? "bg-purple-600 text-white"
              : "text-slate-400"
          }`}
        >
          Compare
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-20">
        {/* HERO SECTION */}
        <div className="text-center mb-10">
          <span className="inline-flex px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase">
            Brutally Honest AI Recruiter Audit
          </span>
          <h2 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight">
            {activeTab === "roast" ? (
              <>
                Let's Roast Your <span className="text-purple-400">Resume</span> 🔥
              </>
            ) : (
              <>
                Track Your <span className="text-orange-400">Improvements</span> 📈
              </>
            )}
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            {activeTab === "roast"
              ? "Input your resume, specify an optional job description, and watch the AI shred it to pieces while giving you genuine improvements."
              : "Compare your old resume with your newly revised resume. Discover what changed, what improved, and what still sucks."}
          </p>
        </div>

        {/* INPUT PANELS */}
        {activeTab === "roast" ? (
          /* SINGLE ROAST VIEW */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resume Upload / Copy panel */}
            <div className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg text-slate-200">1. Paste Resume or Upload PDF</h3>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, "single")}
                    className="hidden"
                  />
                  <div className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1 border border-white/10">
                    📄 {fileName ? "Replace PDF" : "Upload PDF"}
                  </div>
                </label>
              </div>

              {fileName && (
                <div className="px-3 py-1.5 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs text-purple-300 mb-3 flex justify-between items-center">
                  <span>Selected: {fileName}</span>
                  <button
                    onClick={() => {
                      setFileName("");
                      setResume("");
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste the plain text of your resume here..."
                className="w-full h-80 bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-slate-200 resize-none outline-none placeholder:text-slate-600 focus:border-purple-500/50 transition-all text-sm leading-relaxed"
              />

              <div className="flex justify-between items-center mt-3 text-xs">
                <span
                  className={resume.length >= MIN_LENGTH ? "text-green-400" : "text-red-400"}
                >
                  {resume.length}/{MIN_LENGTH} characters
                </span>
                <span className="text-slate-500">Minimum 200 characters</span>
              </div>
            </div>

            {/* Role & Keyword analyzer context */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between shadow-2xl">
              <div>
                <h3 className="font-semibold text-lg text-slate-200 mb-4">2. ATS Keyword Context (Optional)</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Target Role / Job Title
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Frontend Engineer"
                      className="w-full bg-slate-950/40 border border-white/5 rounded-xl px-4 py-2.5 text-slate-200 outline-none placeholder:text-slate-600 focus:border-purple-500/50 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Target Job Description
                    </label>
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the job description to check for keyword density and ATS matching..."
                      className="w-full h-44 bg-slate-950/40 border border-white/5 rounded-xl p-4 text-slate-200 resize-none outline-none placeholder:text-slate-600 focus:border-purple-500/50 transition-all text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSingleRoast}
                disabled={loading || resume.length < MIN_LENGTH}
                className="mt-6 w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 hover:scale-[1.02] active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-purple-500/20 text-white text-sm"
              >
                {loading ? "Roasting..." : "Roast My Resume 🔥"}
              </button>
            </div>
          </div>
        ) : (
          /* COMPARISON VIEW */
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <h3 className="font-semibold text-lg text-slate-200 mb-4">Upload or Paste Both Resumes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Old Resume */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Original Resume (Before)
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, "old")}
                      className="hidden"
                    />
                    <span className="text-[10px] bg-slate-800 text-slate-300 hover:bg-slate-700 px-2.5 py-1 rounded-md font-semibold transition-all">
                      📄 Upload PDF
                    </span>
                  </label>
                </div>
                {fileNameOld && (
                  <p className="text-xs text-purple-400 mb-1">Selected: {fileNameOld}</p>
                )}
                <textarea
                  value={resumeOld}
                  onChange={(e) => setResumeOld(e.target.value)}
                  placeholder="Paste old resume..."
                  className="w-full h-64 bg-slate-950/40 border border-white/5 rounded-xl p-3 text-slate-200 resize-none outline-none placeholder:text-slate-700 text-xs focus:border-purple-500/50"
                />
              </div>

              {/* New Resume */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Improved Resume (After)
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, "new")}
                      className="hidden"
                    />
                    <span className="text-[10px] bg-slate-800 text-slate-300 hover:bg-slate-700 px-2.5 py-1 rounded-md font-semibold transition-all">
                      📄 Upload PDF
                    </span>
                  </label>
                </div>
                {fileNameNew && (
                  <p className="text-xs text-purple-400 mb-1">Selected: {fileNameNew}</p>
                )}
                <textarea
                  value={resumeNew}
                  onChange={(e) => setResumeNew(e.target.value)}
                  placeholder="Paste new resume..."
                  className="w-full h-64 bg-slate-950/40 border border-white/5 rounded-xl p-3 text-slate-200 resize-none outline-none placeholder:text-slate-700 text-xs focus:border-purple-500/50"
                />
              </div>
            </div>

            <button
              onClick={handleCompareRoast}
              disabled={loading || resumeOld.length < MIN_LENGTH || resumeNew.length < MIN_LENGTH}
              className="mt-6 w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 hover:scale-[1.02] active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-orange-500/20 text-white text-sm"
            >
              {loading ? "Comparing..." : "Compare & Analyze Improvements 📈"}
            </button>
          </div>
        )}

        {/* LOADING DISPLAY */}
        {loading && (
          <div className="mt-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center animate-pulse shadow-2xl">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-500/20 rounded-full" />
              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-purple-500 rounded-full animate-spin" />
            </div>
            <p className="text-purple-300 font-semibold text-lg">{loadingText}</p>
          </div>
        )}

        {/* RESULTS MODULE */}
        {result && !loading && (
          <div className="mt-10 animate-fade-in space-y-6">
            {/* SCORE BREAKDOWN GAUGE DISPLAY */}
            {parsedScores && (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h3 className="font-bold text-lg text-slate-200 mb-6 flex items-center gap-2">
                  📊 Score Dashboard
                </h3>

                {parsedScores.original !== undefined && parsedScores.improved !== undefined ? (
                  /* Comparison Score Grid */
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-4">
                    <CircularGauge score={parsedScores.original} title="Original Score" size="large" />
                    <div className="text-center">
                      <div className="text-4xl font-black text-green-400 bg-green-500/10 px-4 py-2 rounded-2xl border border-green-500/20">
                        {parsedScores.improved - parsedScores.original >= 0 ? "+" : ""}
                        {parsedScores.improved - parsedScores.original}
                      </div>
                      <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase block mt-2">
                        Score Lift
                      </span>
                    </div>
                    <CircularGauge score={parsedScores.improved} title="Improved Score" size="large" />
                  </div>
                ) : (
                  /* Single Roast Score Grid */
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {parsedScores.overall !== undefined && (
                      <div className="col-span-2 md:col-span-1 flex justify-center">
                        <CircularGauge score={parsedScores.overall} title="Overall ATS" size="large" />
                      </div>
                    )}
                    {parsedScores.skills !== undefined && (
                      <div className="flex justify-center">
                        <CircularGauge score={parsedScores.skills} title="Skills Match" size="small" />
                      </div>
                    )}
                    {parsedScores.projects !== undefined && (
                      <div className="flex justify-center">
                        <CircularGauge score={parsedScores.projects} title="Projects Score" size="small" />
                      </div>
                    )}
                    {parsedScores.experience !== undefined && (
                      <div className="flex justify-center">
                        <CircularGauge score={parsedScores.experience} title="Experience Score" size="small" />
                      </div>
                    )}
                    {parsedScores.formatting !== undefined && (
                      <div className="flex justify-center">
                        <CircularGauge score={parsedScores.formatting} title="Formatting Score" size="small" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DETAILED ROAST SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main commentary */}
              <div className="lg:col-span-2 space-y-6">
                {parsedSections
                  .filter((sec) => !sec.title.includes("Analysis") && !sec.title.includes("Comparison"))
                  .map((sec, idx) => {
                    const isRoast = sec.title.includes("Roast");
                    const isFix = sec.title.includes("Fix") || sec.title.includes("Fixes");
                    const isAdded = sec.title.includes("Added");
                    const isRemoved = sec.title.includes("Removed");

                    let borderClass = "border-white/10";
                    let bgClass = "bg-white/5";
                    let titleColor = "text-slate-200";

                    if (isRoast) {
                      borderClass = "border-orange-500/20";
                      bgClass = "bg-orange-950/10";
                      titleColor = "text-orange-400";
                    } else if (isFix) {
                      borderClass = "border-purple-500/20";
                      bgClass = "bg-purple-950/10";
                      titleColor = "text-purple-400";
                    } else if (isAdded) {
                      borderClass = "border-green-500/20";
                      bgClass = "bg-green-950/10";
                      titleColor = "text-green-400";
                    } else if (isRemoved) {
                      borderClass = "border-red-500/20";
                      bgClass = "bg-red-950/10";
                      titleColor = "text-red-400";
                    }

                    return (
                      <div
                        key={idx}
                        className={`backdrop-blur-xl border rounded-3xl p-6 shadow-xl ${bgClass} ${borderClass}`}
                      >
                        <h4 className={`text-xl font-bold mb-3 ${titleColor}`}>{sec.title}</h4>
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                          {sec.content}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Right Column - Secondary cards (e.g. Red Flags) */}
              <div className="space-y-6">
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-slate-200">Raw Markdown</h4>
                    <button
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all border border-white/10"
                    >
                      📋 Copy Markdown
                    </button>
                  </div>
                  <pre className="text-xs text-slate-500 max-h-96 overflow-y-auto bg-slate-950/60 p-4 rounded-2xl whitespace-pre-wrap select-all font-mono">
                    {result}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ROAST HISTORY SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 transition-opacity">
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-white/10 shadow-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  🕒 Roast History
                </h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto max-h-[80vh] space-y-4 pr-1">
                {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-12">
                    No roasts on file yet. Upload a resume to begin!
                  </p>
                ) : (
                  history.map((item) => {
                    let displayName = `Roast #${item.id}`;
                    let isComp = false;
                    let targetRole = "";
                    let scores = parseAtsScores(item.roast_result);

                    if (item.resume_text.startsWith("---METADATA---")) {
                      try {
                        const parts = item.resume_text.split("\n\n");
                        const meta = JSON.parse(parts[0].replace("---METADATA---", "").trim());
                        if (meta.isComparison) {
                          isComp = true;
                          displayName = `${meta.filenameOld || "Old"} vs ${meta.filenameNew || "New"}`;
                        } else {
                          displayName = meta.filename || displayName;
                          targetRole = meta.role || "";
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }

                    // Format Badge color
                    let overallVal = scores?.overall || (scores?.improved);
                    let badgeBg = "bg-red-500/10 border-red-500/20 text-red-400";
                    if (overallVal >= 80) badgeBg = "bg-green-500/10 border-green-500/20 text-green-400";
                    else if (overallVal >= 50) badgeBg = "bg-orange-500/10 border-orange-500/20 text-orange-400";

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleReopenRoast(item)}
                        className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-purple-500/40 hover:bg-white/10 transition-all cursor-pointer group flex justify-between items-start"
                      >
                        <div className="truncate flex-1 pr-2">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider mb-1 block">
                            {isComp ? "📊 Comparison" : "📄 Single Roast"}
                          </span>
                          <h4 className="text-sm font-bold text-slate-200 group-hover:text-purple-300 transition-colors truncate">
                            {displayName}
                          </h4>
                          {targetRole && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5 truncate">
                              Targeting: {targetRole}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-500 font-mono mt-1">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>

                        {overallVal !== undefined && (
                          <div className={`px-2 py-1 rounded-lg text-xs font-black border ${badgeBg}`}>
                            {overallVal}%
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center border-t border-white/5 pt-4">
              All data is secured via Supabase auth tokens.
            </p>
          </div>
        </div>
      )}

      {/* AUTHENTICATION OVERLAY MODAL */}
      {authModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute right-4 top-4 p-1 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-200">
                {authMode === "login" ? "Sign In" : "Create Account"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {authMode === "login"
                  ? "Access your personal dashboard and history."
                  : "Start tracking and optimizing your resume today."}
              </p>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3 py-2 rounded-xl mb-4">
                ⚠️ {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 outline-none focus:border-purple-500/50 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 outline-none focus:border-purple-500/50 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-orange-500 hover:opacity-90 active:scale-95 text-sm font-bold rounded-xl transition-all shadow-md shadow-purple-600/25"
              >
                {authLoading ? "Processing..." : authMode === "login" ? "Sign In" : "Sign Up"}
              </button>
            </form>

            <div className="mt-6 text-center border-t border-white/5 pt-4">
              <button
                onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                className="text-xs text-purple-400 hover:underline"
              >
                {authMode === "login"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}