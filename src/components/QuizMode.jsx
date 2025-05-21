import { useState, useEffect } from "react";

function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export default function QuizMode({ segments, targetLang, languages }) {
  const [quizOrder, setQuizOrder] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [options, setOptions] = useState([]);

  useEffect(() => {
    if (segments && segments.length > 0) {
      const validSegments = segments.filter(seg => seg && seg.translated && seg.original);
      setQuizOrder(shuffleArray(validSegments));
      setQuizIndex(0);
      setUserAnswer(null);
      setScore(0);
      setShowScore(false);
      setShowHint(false);
    }
  }, [segments]);
  

  useEffect(() => {
    if (quizOrder.length === 0) return;

    // Generate multiple choice options (1 correct + 3 random others)
    const correct = quizOrder[quizIndex].translated;
    const otherOptions = quizOrder
      .filter((_, i) => i !== quizIndex)
      .map((seg) => seg.translated);

    const choices = shuffleArray([
      correct,
      ...shuffleArray(otherOptions).slice(0, 3),
    ]);
    setOptions(choices);
    setUserAnswer(null);
    setShowHint(false);
  }, [quizIndex, quizOrder]);

  const handleAnswer = (choice) => {
    setUserAnswer(choice);
    if (choice === quizOrder[quizIndex].translated) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (quizIndex + 1 < quizOrder.length) {
      setQuizIndex(quizIndex + 1);
      setUserAnswer(null);
      setShowHint(false);
    } else {
      setShowScore(true);
    }
  };

  const handleRetry = () => {
    setQuizIndex(0);
    setUserAnswer(null);
    setScore(0);
    setShowScore(false);
    setShowHint(false);
  };

  if (segments.length === 0) return null;

  if (showScore) {
    return (
      <div className="p-4 bg-zinc-700 rounded text-center">
        <h3 className="text-xl font-semibold mb-4">Quiz Completed!</h3>
        <p className="mb-4 text-green-400">
          Your score: {score} / {quizOrder.length}
        </p>
        <button
          onClick={handleRetry}
          className="bg-yellow-600 px-6 py-2 rounded hover:bg-yellow-500"
        >
          Retry Quiz
        </button>
      </div>
    );
  }

  const currentSegment = quizOrder[quizIndex];

  return (
    <div className="p-4 bg-zinc-700 rounded max-w-xl mx-auto">
      <h3 className="text-lg font-semibold mb-2">Quiz Mode</h3>
      <p className="mb-1">
        Translate this segment into{" "}
        <span className="font-semibold">
          {languages.find((l) => l.code === targetLang)?.name || targetLang}
        </span>
        :
      </p>
      <p className="mb-3 italic font-semibold">{currentSegment.original}</p>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {options.map((choice, i) => {
          const isCorrect = choice === currentSegment.translated;
          const isSelected = userAnswer === choice;
          const btnClass = isSelected
            ? isCorrect
              ? "bg-green-600"
              : "bg-red-600"
            : "bg-yellow-600 hover:bg-yellow-500";

          return (
            <button
              key={i}
              onClick={() => handleAnswer(choice)}
              disabled={userAnswer !== null}
              className={`py-2 rounded font-semibold ${btnClass}`}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {userAnswer && (
        <div className="mb-3">
          {userAnswer === currentSegment.translated ? (
            <p className="text-green-400 font-semibold">Correct!</p>
          ) : (
            <p className="text-red-400 font-semibold">
              Incorrect. Correct answer:{" "}
              <span className="underline">{currentSegment.translated}</span>
            </p>
          )}
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowHint((h) => !h)}
          className="bg-zinc-600 px-3 py-1 rounded hover:bg-zinc-500"
        >
          {showHint ? "Hide Hint" : "Show Hint"}
        </button>

        <button
          onClick={handleNext}
          disabled={!userAnswer}
          className="bg-yellow-600 px-6 py-2 rounded font-semibold disabled:opacity-50"
        >
          {quizIndex + 1 === quizOrder.length ? "Finish" : "Next"}
        </button>
      </div>

      {showHint && currentSegment.transliteration && (
        <p className="mt-2 italic text-zinc-300">
          Hint (Transliteration): {currentSegment.transliteration}
        </p>
      )}

      <div className="mt-3 h-2 bg-zinc-600 rounded">
        <div
          className="h-2 bg-yellow-600 rounded"
          style={{ width: `${((quizIndex + 1) / quizOrder.length) * 100}%` }}
          aria-label={`Progress: ${quizIndex + 1} of ${quizOrder.length}`}
        />
      </div>
    </div>
  );
}
