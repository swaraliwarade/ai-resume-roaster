import { useState } from "react";

import { roastResume } from "./api";



export default function App() {

  const [resume, setResume] = useState("");

  const [result, setResult] = useState("");

  const [loading, setLoading] = useState(false);

  const [loadingText, setLoadingText] = useState("");

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
  "Almost ready to roast..."
];

const handleSubmit = async () => {
  if (resume.length < MIN_LENGTH) return;

  setLoading(true);
  setResult("");

  setLoadingText(
    loadingMessages[
      Math.floor(Math.random() * loadingMessages.length)
    ]
  );

  try {
    const data = await roastResume(resume);

    if (data.success) {
      setResult(data.roast);
    } else {
      setResult("🔥 The AI got roasted before your resume did.");
    }
  } catch (error) {
    console.error(error);
    setResult("🔥 Something went wrong while roasting your resume.");
  }

  setLoading(false);
};

  return (

  <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">

    {/* Background Glow */}

    <div className="absolute top-0 left-0 w-96 h-96 bg-purple-600/20 blur-3xl rounded-full" />

    <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/20 blur-3xl rounded-full" />



    <div className="relative max-w-5xl mx-auto px-6 py-12">

      {/* HERO */}

      <div className="text-center mb-12">

        <span className="inline-flex px-4 py-2 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300 text-sm">

          AI-Powered Resume Feedback

        </span>



        <h1 className="mt-6 text-6xl font-bold tracking-tight">

          Resume

          <span className="text-purple-400"> Roaster</span>

          🔥

        </h1>



        <p className="mt-4 text-slate-400 text-lg max-w-2xl mx-auto">

          Brutally honest recruiter feedback. Actionable improvements.

          Zero sugarcoating.

        </p>

      </div>



      {/* INPUT CARD */}

      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">

        <textarea

          value={resume}

          onChange={(e) => setResume(e.target.value)}

          placeholder="Paste your resume here..."

          className="

            w-full

            h-80

            bg-transparent

            text-white

            resize-none

            outline-none

            placeholder:text-slate-500

          "

        />



        <div className="flex justify-between items-center mt-4">

          <span

            className={`text-sm font-medium ${

              resume.length >= MIN_LENGTH

                ? "text-green-400"

                : "text-red-400"

            }`}

          >

            {resume.length}/{MIN_LENGTH} characters

          </span>



          <span className="text-xs text-slate-500">

            Minimum 200 characters required

          </span>

        </div>



        <button

          onClick={handleSubmit}

          disabled={loading || resume.length < MIN_LENGTH}

          className="mt-6 w-full py-4 rounded-2xl font-semibold bg-gradient-to-r from-purple-600 to-orange-500 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-purple-500/20">

          {loading ? "Roasting..." : "Roast My Resume 🔥"}

        </button>



        {/* LOADING */}

        {loading && (

  <div className="flex items-center justify-center gap-3 mt-6">

    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />

    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />

    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />



    <span className="text-purple-300">

      {loadingText}

    </span>

  </div>

)}

      </div>



      {/* RESULTS */}

      {result && (

        <div

          className="

            mt-10

            rounded-3xl

            border

            border-white/10

            bg-white/5

            backdrop-blur-xl

            p-8

            shadow-2xl

            animate-fade-in

          "

        >

          <div className="flex justify-between items-center mb-6">

            <h2 className="text-3xl font-bold">

              Roast Results 🔥

            </h2>



            <button

              onClick={() =>

                navigator.clipboard.writeText(result)

              }

              className="

                px-4

                py-2

                rounded-xl

                border

                border-white/10

                hover:bg-white/10

                transition

              "

            >

              📋 Copy

            </button>

          </div>



          <pre className="whitespace-pre-wrap text-slate-300 leading-8 text-[15px]">

            {result}

          </pre>

        </div>

      )}

    </div>

  </div>

);

}