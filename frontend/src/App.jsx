import { useState } from "react";

export default function App() {
  const [resume, setResume] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const MIN_LENGTH = 200;

  const handleSubmit = async () => {
    if (resume.length < MIN_LENGTH) return;

    setLoading(true);
    setResult("");

    // Temporary mock response
    setTimeout(() => {
      setResult(`
🔥 Resume Roast Complete

• Your resume reads like a LinkedIn profile written at 2 AM.
• Skills section is longer than your experience section.
• Recruiters should not need detective skills to find your achievements.
• Quantify your impact and remove generic buzzwords.

Overall Score: 6.5/10

Recommendation:
Add measurable achievements, improve formatting consistency,
and tailor the resume to the target role.
      `);

      setLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-400 text-sm font-medium mb-4">
            AI-Powered Resume Feedback
          </span>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight">
            Resume
            <span className="text-fuchsia-500"> Roaster</span>
          </h1>

          <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
            Paste your resume and get brutally honest, constructive AI feedback
            in seconds.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume here..."
            className="w-full h-72 bg-slate-950 border border-slate-800 rounded-2xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />

          <div className="flex items-center justify-between mt-4">
            <p
              className={`text-sm ${
                resume.length >= MIN_LENGTH
                  ? "text-green-400"
                  : "text-slate-500"
              }`}
            >
              {resume.length}/{MIN_LENGTH} characters
            </p>

            <button
              onClick={handleSubmit}
              disabled={loading || resume.length < MIN_LENGTH}
              className="px-6 py-3 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-600 transition-all font-semibold disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {loading ? "Roasting..." : "Roast My Resume 🔥"}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse">
            <p className="text-fuchsia-400 font-medium">
              Analyzing your resume and preparing the roast...
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-8 animate-fadeIn">
            <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">
              Roast Results 🔥
            </h2>

            <div className="whitespace-pre-wrap text-slate-300 leading-7">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}