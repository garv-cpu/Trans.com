import { useState, useEffect, useRef } from "react";
import {
  ArrowRightLeft,
  Mic,
  Volume2,
  Copy,
  Share,
  Star,
  Info,
  X,
} from "lucide-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

const languages = [
  { code: "auto", name: "Detect Language" },
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "ar", name: "Arabic" },
  { code: "ru", name: "Russian" },
  { code: "ko", name: "Korean" },
];

const styles = ["Default", "Formal", "Casual", "Poetic"];

export default function App() {
  // States
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [transliteration, setTransliteration] = useState("");
  const [segments, setSegments] = useState([]);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("hi");
  const [style, setStyle] = useState("Default");
  const [detectedLang, setDetectedLang] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizInput, setQuizInput] = useState("");
  const [showModal, setShowModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [quizMode, setQuizMode] = useState("normal"); // "normal" or "reverse"
  const [timeLeft, setTimeLeft] = useState(15);

  const synth = window.speechSynthesis;
  const { transcript, resetTranscript, listening } = useSpeechRecognition();
  const outputRef = useRef(null);

  useEffect(() => {
    if (quizIndex >= segments.length) return; // Do nothing if quiz is over

    if (timeLeft <= 0) {
      setStreak(0);
      setQuizInput("");
      setTimeLeft(15);
      setQuizIndex((i) => (i + 1) % segments.length);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizIndex, segments.length]);

  // Load favorites & recent from localStorage on mount
  useEffect(() => {
    const fav = localStorage.getItem("translator_favorites");
    if (fav) setFavorites(JSON.parse(fav));
    const rec = localStorage.getItem("translator_recent");
    if (rec) setRecent(JSON.parse(rec));
  }, []);

  // Save favorites & recent to localStorage on changes
  useEffect(() => {
    localStorage.setItem("translator_favorites", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("translator_recent", JSON.stringify(recent));
  }, [recent]);

  // Sync speech transcript to inputText
  useEffect(() => {
    if (transcript) setInputText(transcript);
  }, [transcript]);

  // Clear quiz input on quizIndex change
  useEffect(() => {
    setQuizInput("");
  }, [quizIndex]);

  useEffect(() => {
    setQuizInput("");
    setShowHint(false);
  }, [quizIndex]);

  // Fuzzy similarity: Jaccard Index-like approach
  function similarityScore(a, b) {
    a = a.trim().toLowerCase();
    b = b.trim().toLowerCase();

    if (!a || !b) return 0;

    const aWords = new Set(a.split(/\s+/));
    const bWords = new Set(b.split(/\s+/));

    const intersection = new Set([...aWords].filter((w) => bWords.has(w)));
    const union = new Set([...aWords, ...bWords]);

    return intersection.size / union.size;
  }
  function scoreFeedback(score) {
    if (score >= 0.7) return "🎉 Woohoo! Nailed it!";
    if (score >= 0.4) return "🤔 Almost... try again!";
    return "😓 Nope! Give it another shot.";
  }

  // Swap languages
  const swapLanguages = () => {
    // Avoid swapping if auto is source (makes no sense)
    if (sourceLang === "auto") return;
    const oldSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(oldSource);
    setOutputText("");
    setSegments([]);
    setDetectedLang(null);
  };

  // Translate text
  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setOutputText("");
    setTransliteration("");
    setSegments([]);
    setDetectedLang(null);
    try {
      // Note: Google Translate free API doesn't support styles/formality,
      // So style param will be ignored, but UI kept for demo.

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=ld&dt=rm&q=${encodeURIComponent(
        inputText
      )}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!Array.isArray(data)) throw new Error("Unexpected API response");

      const translated = data[0].map((chunk) => chunk[0]).join("");
      setOutputText(translated);

      if (sourceLang === "auto" && data[8] && data[8][0]) {
        setDetectedLang(data[8][0]);
      } else {
        setDetectedLang(null);
      }

      if (data[1]?.length > 0) {
        setTransliteration(data[1][0][1] || "");
      } else {
        setTransliteration("");
      }

      const phraseSegments = data[0].map((chunk) => ({
        original: chunk[1],
        translated: chunk[0],
      }));
      setSegments(phraseSegments);

      // Add to recent, avoid duplicates
      const newRecent = {
        input: inputText,
        output: translated,
        time: Date.now(),
        langFrom: sourceLang,
        langTo: targetLang,
      };
      setRecent((old) => {
        const filtered = old.filter((r) => r.input !== inputText);
        return [newRecent, ...filtered].slice(0, 50); // Keep max 50
      });
    } catch (err) {
      setError("Translation failed. Try again.");
      setOutputText("");
      setTransliteration("");
      setSegments([]);
      setDetectedLang(null);
    }
    setLoading(false);
  };

  // Copy output to clipboard
  const copyOutput = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
  };

  // Share output using Web Share API
  const shareOutput = () => {
    if (!outputText) return;
    if (navigator.share) {
      navigator
        .share({
          title: "Translation",
          text: outputText,
        })
        .catch(() => {});
    } else {
      alert("Sharing not supported in this browser.");
    }
  };

  // Speak output text
  const speakOutput = () => {
    if (!outputText || !synth) return;
    if (synth.speaking) {
      synth.cancel();
      return;
    }
    const utter = new SpeechSynthesisUtterance(outputText);
    utter.lang = targetLang === "auto" ? "en-US" : targetLang;
    synth.speak(utter);
  };

  // Start/stop speech recognition
  const toggleListening = () => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      return <p>Your browser does not support speech recognition.</p>;
    }
    if (listening) SpeechRecognition.stopListening();
    else
      SpeechRecognition.startListening({
        continuous: true,
        language: sourceLang === "auto" ? "en" : sourceLang,
      });
  };

  // Add to favorites
  const addToFavorites = () => {
    if (!inputText || !outputText) return;
    const newFav = {
      input: inputText,
      output: outputText,
      langFrom: sourceLang,
      langTo: targetLang,
      time: Date.now(),
    };
    setFavorites((old) => {
      const exists = old.find(
        (f) =>
          f.input === inputText &&
          f.output === outputText &&
          f.langFrom === sourceLang &&
          f.langTo === targetLang
      );
      if (exists) return old; // Avoid duplicates
      return [newFav, ...old].slice(0, 100);
    });
  };

  // Remove from favorites
  const removeFromFavorites = (index) => {
    setFavorites((old) => old.filter((_, i) => i !== index));
  };

  // Export favorites to PDF
  const exportFavoritesToPDF = () => {
    if (favorites.length === 0) return alert("No favorites to export.");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Favorite Translations", 10, 15);
    doc.setFontSize(12);
    favorites.forEach((fav, i) => {
      const y = 25 + i * 30;
      doc.text(`${i + 1}. From (${fav.langFrom}) to (${fav.langTo})`, 10, y);
      doc.text(`Input: ${fav.input}`, 10, y + 7);
      doc.text(`Output: ${fav.output}`, 10, y + 14);
      if (y + 40 > 280) doc.addPage(); // Add page if close to end
    });
    doc.save("favorites.pdf");
  };

  // Clear input/output
  const clearAll = () => {
    setInputText("");
    setOutputText("");
    setTransliteration("");
    setSegments([]);
    setDetectedLang(null);
    setQuizIndex(0);
    setQuizInput("");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">
        You are at <span className="text-yellow-500">Trans</span>
      </h1>

      {/* Language selectors and swap */}
      <div className="flex flex-wrap items-center gap-3 mb-4 justify-center">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="bg-zinc-800 px-3 py-2 rounded border border-zinc-700"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>

        <button
          onClick={swapLanguages}
          title="Swap Languages"
          className="bg-zinc-700 p-2 rounded hover:bg-zinc-600"
          disabled={sourceLang === "auto"}
        >
          <ArrowRightLeft />
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="bg-zinc-800 px-3 py-2 rounded border border-zinc-700"
        >
          {languages
            .filter((l) => l.code !== sourceLang)
            .map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
        </select>
      </div>

      {/* Input Textarea with mic and clear */}
      <div className="relative mb-4">
        <textarea
          rows={4}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text to translate"
          className="w-full bg-zinc-800 p-3 rounded border border-zinc-700 resize-none focus:outline-none focus:border-yellow-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // prevent newline insertion
              if (!loading && inputText.trim()) {
                handleTranslate();
              }
            }
          }}
        />
        <button
          onClick={toggleListening}
          title={listening ? "Stop Listening" : "Start Listening"}
          className={`absolute top-2 right-15 p-2 rounded ${
            listening ? "bg-red-600" : "bg-yellow-600"
          } hover:opacity-80`}
        >
          <Mic />
        </button>
        <button
          onClick={() => setInputText("")}
          title="Clear Input"
          className="absolute top-2 right-2 p-2 rounded bg-zinc-700 hover:bg-zinc-600"
        >
          <X />
        </button>
      </div>

      {/* Translate & Clear buttons */}
      <div className="flex gap-3 mb-4 justify-center">
        <button
          onClick={handleTranslate}
          disabled={loading || !inputText.trim()}
          className="bg-yellow-600 px-6 py-2 rounded font-semibold disabled:opacity-50"
        >
          {loading ? "Translating..." : "Translate"}
        </button>
        <button
          onClick={clearAll}
          disabled={loading && !inputText && !outputText}
          className="bg-zinc-700 px-6 py-2 rounded hover:bg-zinc-600 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-700 text-red-100 p-3 rounded mb-4 text-center">
          {error}
        </div>
      )}

      {/* Detected language info */}
      {detectedLang && (
        <div
          className="flex items-center gap-1 text-yellow-400 mb-2 cursor-default select-none"
          title="Detected source language"
        >
          <Info size={16} /> Detected language:{" "}
          {languages.find((l) => l.code === detectedLang)?.name ?? detectedLang}
        </div>
      )}

      {/* Output box */}
      <div className="relative bg-zinc-800 rounded p-4 min-h-[6rem] mb-4">
        {outputText ? (
          <>
            <p
              ref={outputRef}
              className="whitespace-pre-wrap"
              aria-live="polite"
            >
              {outputText}
            </p>
            {/* Transliteration */}
            {transliteration && (
              <p className="mt-1 text-sm text-zinc-400 italic">
                Transliteration: {transliteration}
              </p>
            )}
            {/* Actions */}
            <div className="flex gap-3 mt-3">
              <button
                onClick={speakOutput}
                title="Speak Output"
                className="bg-yellow-600 p-2 rounded hover:bg-yellow-500"
              >
                <Volume2 />
              </button>
              <button
                onClick={copyOutput}
                title="Copy Output"
                className="bg-yellow-600 p-2 rounded hover:bg-yellow-500"
              >
                <Copy />
              </button>
              <button
                onClick={shareOutput}
                title="Share Output"
                className="bg-yellow-600 p-2 rounded hover:bg-yellow-500"
              >
                <Share />
              </button>
              <button
                onClick={addToFavorites}
                title="Add to Favorites"
                className="bg-yellow-600 p-2 rounded hover:bg-yellow-500 ml-auto"
              >
                <Star />
              </button>
            </div>
          </>
        ) : (
          <p className="text-zinc-400 italic">
            Translation output will appear here
          </p>
        )}
      </div>

      {/* SEGMENTS AND QUIZ
      {segments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Translation Segments</h2>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {segments.map((seg, i) => (
              <li key={i} className="p-2 bg-zinc-700 rounded">
                <div className="font-semibold">{seg.original}</div>
                <div className="text-yellow-400">{seg.translated}</div>
              </li>
            ))}
          </ul>

          {/* Interactive Quiz Mode */}
      {/* <div className="mt-4 p-4 bg-zinc-700 rounded relative overflow-hidden transition-all">
            <h3 className="text-lg font-semibold mb-3 text-center">
               Quiz Mode
            </h3>

            <button
              onClick={() =>
                setQuizMode((m) => (m === "normal" ? "reverse" : "normal"))
              }
              className="absolute top-2 right-2 text-sm text-zinc-400 hover:text-yellow-400"
            >
               {quizMode === "normal" ? "Reverse Mode" : "Normal Mode"}
            </button>

            {quizIndex < segments.length ? (
              <>
                <div className="text-center mb-2">
                  <p>
                    Translate into{" "}
                    <span className="font-semibold text-yellow-400">
                      {languages.find((l) => l.code === targetLang)?.name}
                    </span>
                  </p>
                  <p className="text-xl italic font-semibold mt-2 text-zinc-100">
                    “
                    {quizMode === "normal"
                      ? segments[quizIndex].original
                      : segments[quizIndex].translated}
                    ”
                  </p>
                </div>

                <input
                  type="text"
                  value={quizInput}
                  onChange={(e) => setQuizInput(e.target.value)}
                  className={`w-full p-3 rounded bg-zinc-800 border ${
                    quizInput &&
                    similarityScore(
                      quizInput,
                      quizMode === "normal"
                        ? segments[quizIndex].translated
                        : segments[quizIndex].original
                    ) >= 0.7
                      ? "border-green-500"
                      : "border-zinc-600"
                  } text-white transition-all duration-300`}
                  placeholder={
                    quizMode === "normal"
                      ? "Type your translation..."
                      : "Type the original phrase..."
                  }
                />

                <div className="flex justify-between items-center mt-3">
                  <button
                    onClick={() =>
                      setQuizIndex((i) => (i > 0 ? i - 1 : segments.length - 1))
                    }
                    className="bg-yellow-600 px-4 py-1.5 rounded hover:bg-yellow-500 font-semibold"
                  >
                    ⬅ Prev
                  </button>

                  <button
                    onClick={() => {
                      const utterance = new SpeechSynthesisUtterance(
                        quizMode === "normal"
                          ? segments[quizIndex].original
                          : segments[quizIndex].translated
                      );
                      utterance.lang = "en";
                      speechSynthesis.speak(utterance);
                    }}
                    className="bg-zinc-600 px-4 py-1.5 rounded hover:bg-zinc-500 font-semibold"
                  >
                     Speak
                  </button>

                  <button
                    onClick={() => {
                      const scoreNow = similarityScore(
                        quizInput,
                        quizMode === "normal"
                          ? segments[quizIndex].translated
                          : segments[quizIndex].original
                      );

                      if (scoreNow >= 0.7) {
                        setScore((s) => s + timeLeft * 10);
                        setStreak((s) => s + 1);
                      } else {
                        setStreak(0);
                      }

                      setQuizInput("");
                      setTimeLeft(15);
                      setQuizIndex((i) => (i + 1) % segments.length);
                    }}
                    className="bg-yellow-600 px-4 py-1.5 rounded hover:bg-yellow-500 font-semibold"
                  >
                    Next ➡
                  </button>
                </div> */}

      {/* Feedback */}
      {/* {quizInput && (
                  <p
                    className={`mt-3 text-center font-semibold text-xl ${
                      similarityScore(
                        quizInput,
                        quizMode === "normal"
                          ? segments[quizIndex].translated
                          : segments[quizIndex].original
                      ) >= 0.7
                        ? "text-green-400 animate-pulse"
                        : similarityScore(
                            quizInput,
                            quizMode === "normal"
                              ? segments[quizIndex].translated
                              : segments[quizIndex].original
                          ) >= 0.4
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {(() => {
                      const scoreNow = similarityScore(
                        quizInput,
                        quizMode === "normal"
                          ? segments[quizIndex].translated
                          : segments[quizIndex].original
                      );
                      if (scoreNow >= 0.7) return "🎉 Woohoo! Nailed it!";
                      if (scoreNow >= 0.4)
                        return "🤔 Almost... check structure or spelling.";
                      return "😓 Not quite yet...";
                    })()}
                  </p>
                )}

                {/* Score and Timer */}
      {/* <div className="mt-3 text-center">
                  <p className="text-white font-semibold">
                    🕒 Time left: {timeLeft}s | ⭐ Score: {score} | 🔥 Streak:{" "}
                    {streak}
                  </p>
                </div> */}

      {/* Progress Bar */}
      {/* <div className="mt-4 h-2 bg-zinc-600 rounded">
                  <div
                    className="h-2 bg-yellow-500 rounded transition-all"
                    style={{
                      width: `${((quizIndex + 1) / segments.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </>
            ) : ( */}
      {/* <div className="text-center mt-4">
                <h4 className="text-xl font-bold text-green-400 mb-2">
                  🏁 Quiz Complete!
                </h4>
                <p className="text-zinc-100">Final Score: {score}</p>
                <p className="text-yellow-300">🔥 Highest Streak: {streak}</p>
                <button
                  onClick={() => {
                    setQuizIndex(0);
                    setScore(0);
                    setStreak(0);
                    setQuizInput("");
                    setTimeLeft(15);
                  }}
                  className="mt-3 px-4 py-2 bg-yellow-500 rounded hover:bg-yellow-400"
                >
                  🔁 Replay Quiz
                </button>
              </div>
            )}
          </div>
        </div>
      )}  */}

      {/* Favorites and Recent buttons */}
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={() => setShowModal("favorites")}
          className="bg-yellow-600 px-5 py-2 rounded font-semibold"
          disabled={favorites.length === 0}
        >
          Favorites ({favorites.length})
        </button>
        <button
          onClick={() => setShowModal("recent")}
          className="bg-yellow-600 px-5 py-2 rounded font-semibold"
          disabled={recent.length === 0}
        >
          Recent ({recent.length})
        </button>
      </div>

      {/* Export favorites button */}
      <div className="text-center mb-6">
        <button
          onClick={exportFavoritesToPDF}
          disabled={favorites.length === 0}
          className="bg-yellow-600 px-6 py-2 rounded font-semibold disabled:opacity-50"
        >
          Export Favorites as PDF
        </button>
      </div>

      {/* Modals for Favorites and Recent */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-6 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(null)}
          >
            <motion.div
              className="bg-zinc-900 max-w-2xl w-full max-h-[80vh] rounded p-6 overflow-y-auto relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(null)}
                className="absolute top-3 right-3 p-1 rounded hover:bg-zinc-700"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold mb-4 capitalize">
                {showModal}
              </h2>

              {(showModal === "favorites" ? favorites : recent).length === 0 ? (
                <p className="italic text-zinc-400">No entries.</p>
              ) : (
                <ul className="space-y-4">
                  {(showModal === "favorites" ? favorites : recent).map(
                    (item, i) => (
                      <li
                        key={i}
                        className="bg-zinc-800 p-4 rounded relative"
                        aria-label={`Translation from ${item.langFrom} to ${item.langTo}`}
                      >
                        <div>
                          <strong>Input:</strong> {item.input}
                        </div>
                        <div className="text-yellow-400">
                          <strong>Output:</strong> {item.output}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(item.time).toLocaleString()}
                        </div>
                        {showModal === "favorites" && (
                          <button
                            onClick={() => removeFromFavorites(i)}
                            title="Remove from favorites"
                            className="absolute top-2 right-2 p-1 rounded hover:bg-red-600"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </li>
                    )
                  )}
                </ul>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-10 text-sm text-gray-500 text-center">
        © 2025 Trans. Built for the world.
      </footer>
    </div>
  );
}
