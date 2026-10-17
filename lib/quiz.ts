// Things shared by the quiz pages: the Question type and the button/label text.

export type Question = {
  id: string;
  type: "multiple_choice" | "true_false";
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  topic: string;
};

// Every piece of text on the quiz screens, in English and Arabic.
// Arabic quizzes use the Arabic text, so the whole screen matches the quiz language.
const LABELS = {
  en: {
    quiz: "Quiz",
    flashcards: "Flashcards",
    questions: "questions",
    difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
    questionOf: (n: number, total: number) => `Question ${n} of ${total}`,
    correct: "Correct!",
    wrong: "Not quite.",
    correctAnswerIs: "The correct answer is:",
    next: "Next question",
    finish: "See my score",
    yourScore: "Your score",
    perfect: "Perfect score! 🎉",
    great: "Great work!",
    keepGoing: "Keep practising. Review your mistakes to learn them.",
    review: "Review my mistakes",
    hideReview: "Hide my mistakes",
    yourAnswer: "Your answer:",
    tryAgain: "Try again",
    backToDashboard: "Back to dashboard",
    saveError: "We couldn't save your score, but you can still review your answers.",
    cardOf: (n: number, total: number) => `Card ${n} of ${total}`,
    tapToFlip: "Tap the card to flip it",
    previous: "Previous",
    nextCard: "Next",
  },
  ar: {
    quiz: "اختبار",
    flashcards: "بطاقات",
    questions: "أسئلة",
    difficulty: { easy: "سهل", medium: "متوسط", hard: "صعب" },
    questionOf: (n: number, total: number) => `السؤال ${n} من ${total}`,
    correct: "إجابة صحيحة!",
    wrong: "إجابة خاطئة.",
    correctAnswerIs: "الإجابة الصحيحة:",
    next: "السؤال التالي",
    finish: "اعرض نتيجتي",
    yourScore: "نتيجتك",
    perfect: "علامة كاملة! 🎉",
    great: "عمل رائع!",
    keepGoing: "واصل التدريب، وراجع أخطاءك لتتعلم منها.",
    review: "راجع أخطائي",
    hideReview: "إخفاء الأخطاء",
    yourAnswer: "إجابتك:",
    tryAgain: "حاول مرة أخرى",
    backToDashboard: "العودة إلى لوحة التحكم",
    saveError: "لم نتمكن من حفظ نتيجتك، لكن يمكنك مراجعة إجاباتك.",
    cardOf: (n: number, total: number) => `البطاقة ${n} من ${total}`,
    tapToFlip: "اضغط على البطاقة لقلبها",
    previous: "السابق",
    nextCard: "التالي",
  },
};

export type Labels = (typeof LABELS)["en"];

export function getLabels(language: string): Labels {
  return language === "ar" ? LABELS.ar : LABELS.en;
}
