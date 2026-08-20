import { useEffect, useState } from 'react';
import { Brain, Plus, Play, Check, X, Trophy, Star, ArrowLeft, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import type { Quiz, QuizQuestion, QuizAttempt } from '../lib/types';

type View = 'list' | 'take' | 'create' | 'result';

export default function QuizzesPage() {
  const { user, refreshUser } = useUser();
  const [view, setView] = useState<View>('list');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newQuestions, setNewQuestions] = useState<Array<{ question: string; a: string; b: string; c: string; d: string; correct: string }>>(
    [{ question: '', a: '', b: '', c: '', d: '', correct: 'a' }]
  );

  useEffect(() => {
    loadQuizzes();
    loadAttempts();
  }, []);

  const loadQuizzes = async () => {
    const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    if (data) setQuizzes(data as Quiz[]);
    setLoading(false);
  };

  const loadAttempts = async () => {
    if (!user) return;
    const { data } = await supabase.from('quiz_attempts').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10);
    if (data) setAttempts(data as QuizAttempt[]);
  };

  const startQuiz = async (quiz: Quiz) => {
    const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('created_at', { ascending: true });
    if (!data || data.length === 0) return;
    setActiveQuiz(quiz);
    setQuestions(data as QuizQuestion[]);
    setCurrentQ(0);
    setAnswers([]);
    setScore(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setView('take');
  };

  const handleAnswer = (option: string) => {
    if (showFeedback) return;
    setSelectedAnswer(option);
    setShowFeedback(true);
    const correct = questions[currentQ].correct_answer;
    if (option === correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, option]);
  };

  const handleNext = async () => {
    if (currentQ + 1 < questions.length) {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // finish
      const finalScore = answers.filter((a, i) => a === questions[i].correct_answer).length;
      if (user && activeQuiz) {
        await supabase.from('quiz_attempts').insert({
          quiz_id: activeQuiz.id,
          profile_id: user.id,
          profile_name: user.name,
          score: finalScore,
          total_questions: questions.length,
        });
        // award points
        const earned = finalScore * 10;
        await supabase.from('profiles').update({ points: (user.points ?? 0) + earned }).eq('id', user.id);
        await refreshUser();
        await loadAttempts();
      }
      setView('result');
    }
  };

  const handleCreateQuiz = async () => {
    if (!user || !newTitle.trim()) return;
    const validQs = newQuestions.filter((q) => q.question.trim() && q.a.trim() && q.b.trim() && q.c.trim() && q.d.trim());
    if (validQs.length === 0) return;

    const { data: quizData } = await supabase.from('quizzes').insert({
      creator_id: user.id,
      creator_name: user.name,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      category: newCategory,
    }).select('*').maybeSingle();

    if (!quizData) return;
    const quiz = quizData as Quiz;

    for (const q of validQs) {
      await supabase.from('quiz_questions').insert({
        quiz_id: quiz.id,
        question: q.question.trim(),
        option_a: q.a.trim(),
        option_b: q.b.trim(),
        option_c: q.c.trim(),
        option_d: q.d.trim(),
        correct_answer: q.correct,
      });
    }

    setNewTitle('');
    setNewDesc('');
    setNewCategory('General');
    setNewQuestions([{ question: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
    await loadQuizzes();
    setView('list');
  };

  const addQuestion = () => {
    setNewQuestions((prev) => [...prev, { question: '', a: '', b: '', c: '', d: '', correct: 'a' }]);
  };

  const updateQuestion = (idx: number, field: string, value: string) => {
    setNewQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (idx: number) => {
    setNewQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  // ===== TAKE QUIZ VIEW =====
  if (view === 'take' && activeQuiz && questions.length > 0) {
    const q = questions[currentQ];
    const options = [
      { key: 'a', text: q.option_a },
      { key: 'b', text: q.option_b },
      { key: 'c', text: q.option_c },
      { key: 'd', text: q.option_d },
    ];
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <button onClick={() => setView('list')} className="btn-ghost inline-flex items-center gap-2 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Exit Quiz
        </button>
        <div className="glow-card rounded-3xl p-6 sm:p-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-cream">{activeQuiz.title}</h2>
              <p className="text-xs text-slate-500">Question {currentQ + 1} of {questions.length}</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 text-sm font-bold">
              <Star className="w-4 h-4" /> {score}
            </div>
          </div>

          {/* progress bar */}
          <div className="h-2 rounded-full bg-slate-800 mb-6 overflow-hidden">
            <div className="h-full nav-gradient transition-all duration-300"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
          </div>

          <h3 className="text-xl font-bold text-cream mb-6">{q.question}</h3>

          <div className="space-y-3 mb-6">
            {options.map((opt) => {
              const isCorrect = showFeedback && opt.key === q.correct_answer;
              const isSelected = selectedAnswer === opt.key;
              const isWrong = showFeedback && isSelected && opt.key !== q.correct_answer;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={showFeedback}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                    isCorrect
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : isWrong
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'glass border-blue-500/20 text-slate-300 hover:border-blue-500/40'
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: isCorrect ? '#10B98133' : isWrong ? '#F43F5E33' : '#1E3A8A33' }}>
                    {opt.key.toUpperCase()}
                  </span>
                  <span className="flex-1 text-sm">{opt.text}</span>
                  {isCorrect && <Check className="w-5 h-5 text-emerald-400" />}
                  {isWrong && <X className="w-5 h-5 text-rose-400" />}
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <button onClick={handleNext} className="btn-primary w-full">
              {currentQ + 1 < questions.length ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== RESULT VIEW =====
  if (view === 'result' && activeQuiz) {
    const finalScore = answers.filter((a, i) => a === questions[i]?.correct_answer).length;
    const earned = finalScore * 10;
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="glow-card rounded-3xl p-8 text-center animate-pop">
          <div className="w-20 h-20 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-3xl font-bold text-cream mb-2">Quiz Complete!</h2>
          <p className="text-slate-400 mb-6">{activeQuiz.title}</p>
          <div className="flex items-center justify-around mb-6">
            <div>
              <p className="text-4xl font-bold text-blue-400">{finalScore}/{questions.length}</p>
              <p className="text-xs text-slate-500">Correct</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-amber-400">+{earned}</p>
              <p className="text-xs text-slate-500">Points Earned</p>
            </div>
          </div>
          <button onClick={() => { setView('list'); loadQuizzes(); }} className="btn-primary">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // ===== CREATE VIEW =====
  if (view === 'create') {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <button onClick={() => setView('list')} className="btn-ghost inline-flex items-center gap-2 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="glow-card rounded-3xl p-6 animate-slide-up">
          <h2 className="text-xl font-bold text-cream mb-6">Create a Quiz</h2>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Quiz Title</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Class 12 Physics Quiz" className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Description (optional)</label>
              <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What's this quiz about?" className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-2 font-medium">Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="input-field">
                <option>General</option>
                <option>Science</option>
                <option>Math</option>
                <option>History</option>
                <option>English</option>
                <option>Computer Science</option>
              </select>
            </div>
          </div>

          <h3 className="text-sm font-bold text-cream mb-3">Questions ({newQuestions.length})</h3>
          <div className="space-y-4 mb-4">
            {newQuestions.map((q, idx) => (
              <div key={idx} className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Question {idx + 1}</span>
                  {newQuestions.length > 1 && (
                    <button onClick={() => removeQuestion(idx)} className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input type="text" value={q.question} onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                  placeholder="Enter the question..." className="input-field" />
                <div className="grid grid-cols-2 gap-2">
                  {(['a', 'b', 'c', 'd'] as const).map((key) => (
                    <div key={key} className="relative">
                      <input type="text" value={q[key]} onChange={(e) => updateQuestion(idx, key, e.target.value)}
                        placeholder={`Option ${key.toUpperCase()}`} className="input-field pr-8" />
                      <button onClick={() => updateQuestion(idx, 'correct', key)}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                          q.correct === key ? 'bg-emerald-500 text-cream' : 'bg-slate-700 text-slate-500'
                        }`}>
                        {q.correct === key ? <Check className="w-3 h-3" /> : key.toUpperCase()}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500">Green dot marks the correct answer.</p>
              </div>
            ))}
          </div>
          <button onClick={addQuestion} className="btn-ghost flex items-center gap-2 text-sm mb-4">
            <Plus className="w-4 h-4" /> Add Question
          </button>
          <button onClick={handleCreateQuiz} disabled={!newTitle.trim()} className="btn-primary w-full">
            Publish Quiz
          </button>
        </div>
      </div>
    );
  }

  // ===== LIST VIEW =====
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl nav-gradient flex items-center justify-center glow-blue">
            <Brain className="w-5 h-5 text-cream" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-cream text-glow">Quizzes</h2>
            <p className="text-xs text-slate-500">Test your knowledge, earn points</p>
          </div>
        </div>
        <button onClick={() => setView('create')} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Brain className="w-12 h-12 mb-3 opacity-40" />
          <p>No quizzes yet. Create the first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="glow-card glow-card-hover rounded-2xl p-5 animate-fade-in">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">{quiz.category}</span>
              </div>
              <h3 className="text-cream font-bold mb-1">{quiz.title}</h3>
              <p className="text-sm text-slate-400 mb-4">{quiz.description || 'No description'}</p>
              <p className="text-xs text-slate-500 mb-3">By {quiz.creator_name}</p>
              <button onClick={() => startQuiz(quiz)} className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                <Play className="w-4 h-4" /> Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="glow-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-cream mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Your Recent Attempts
          </h3>
          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-800/40">
                <span className="text-sm text-slate-300">
                  {quizzes.find((q) => q.id === a.quiz_id)?.title ?? 'Quiz'}
                </span>
                <span className="text-sm font-bold text-amber-400">{a.score}/{a.total_questions}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
