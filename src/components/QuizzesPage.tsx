import { useState, useEffect } from 'react';
import { Brain, Plus, Play, ArrowLeft, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useUser } from '../context/UserContext';
import { formatTime } from '../lib/hooks';
import type { Quiz, QuizQuestion } from '../lib/types';

const CATEGORIES = ['General', 'Science', 'Math', 'History', 'Sports', 'Entertainment', 'Other'];

export default function QuizzesPage() {
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    const loadQuizzes = async () => {
      const { data } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false });
      if (data) setQuizzes(data as Quiz[]);
      setLoading(false);
    };
    loadQuizzes();

    const channel = supabase
      .channel('quizzes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quizzes' },
        (payload) => setQuizzes((prev) => [payload.new as Quiz, ...prev]))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'quizzes' },
        (payload) => setQuizzes((prev) => prev.filter((q) => q.id !== payload.old.id)))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (activeQuiz) {
    return <QuizPlayer quiz={activeQuiz} onBack={() => setActiveQuiz(null)} userId={user?.id ?? ''} userName={user?.name ?? ''} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-cream">Quizzes</h2>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary px-4 py-2 flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Create
        </button>
      </div>

      {showCreate && <QuizCreator onDone={() => setShowCreate(false)} userId={user?.id ?? ''} userName={user?.name ?? ''} />}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No quizzes yet. Create one to challenge the community!</p>
        </div>
      ) : (
        quizzes.map((quiz) => (
          <div key={quiz.id} className="glass-strong rounded-2xl p-4 animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-sm font-bold text-cream">{quiz.title}</h3>
                {quiz.description && <p className="text-xs text-slate-400 mt-1">{quiz.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{quiz.category}</span>
                  <span className="text-xs text-slate-500">by {quiz.creator_name}</span>
                  <span className="text-xs text-slate-600">{formatTime(quiz.created_at)}</span>
                </div>
              </div>
              <button onClick={() => setActiveQuiz(quiz)} className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1">
                <Play className="w-3.5 h-3.5" /> Play
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function QuizCreator({ onDone, userId, userName }: { onDone: () => void; userId: string; userName: string }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('General');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState('a');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addQuestion = () => {
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()) {
      setError('Fill in all fields for the question.');
      return;
    }
    setQuestions((prev) => [...prev, {
      id: `temp-${prev.length}`, quiz_id: '', question: qText.trim(),
      option_a: optA.trim(), option_b: optB.trim(), option_c: optC.trim(), option_d: optD.trim(),
      correct_answer: correct, created_at: new Date().toISOString(),
    }]);
    setQText(''); setOptA(''); setOptB(''); setOptC(''); setOptD(''); setCorrect('a'); setError('');
  };

  const handleSave = async () => {
    if (!title.trim() || questions.length === 0) { setError('Add a title and at least one question.'); return; }
    setSaving(true); setError('');
    const { data, error: quizError } = await supabase
      .from('quizzes')
      .insert({ creator_id: userId, creator_name: userName, title: title.trim(), description: desc.trim() || null, category })
      .select('*')
      .maybeSingle();
    if (quizError || !data) { setError('Failed to create quiz.'); setSaving(false); return; }
    const quiz = data as Quiz;
    const { error: qError } = await supabase.from('quiz_questions').insert(
      questions.map((q) => ({
        quiz_id: quiz.id, question: q.question,
        option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
        correct_answer: q.correct_answer,
      }))
    );
    setSaving(false);
    if (qError) { setError('Failed to save questions.'); return; }
    onDone();
  };

  return (
    <div className="glass-strong rounded-2xl p-4 space-y-3 animate-slide-up">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" className="input-field" />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="input-field resize-none" />
      <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
        {CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
      </select>

      <div className="border-t border-blue-500/10 pt-3 space-y-2">
        <p className="text-sm font-medium text-slate-300">Questions ({questions.length})</p>
        {questions.map((q, i) => (
          <div key={q.id} className="text-xs text-slate-400 px-3 py-2 rounded-lg bg-slate-800/40">
            {i + 1}. {q.question} <span className="text-blue-400">(answer: {q.correct_answer})</span>
          </div>
        ))}
        <input type="text" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Question" className="input-field text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Option A" className="input-field text-sm" />
          <input type="text" value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Option B" className="input-field text-sm" />
          <input type="text" value={optC} onChange={(e) => setOptC(e.target.value)} placeholder="Option C" className="input-field text-sm" />
          <input type="text" value={optD} onChange={(e) => setOptD(e.target.value)} placeholder="Option D" className="input-field text-sm" />
        </div>
        <select value={correct} onChange={(e) => setCorrect(e.target.value)} className="input-field text-sm">
          <option value="a" className="bg-slate-900">Correct: A</option>
          <option value="b" className="bg-slate-900">Correct: B</option>
          <option value="c" className="bg-slate-900">Correct: C</option>
          <option value="d" className="bg-slate-900">Correct: D</option>
        </select>
        <button onClick={addQuestion} className="btn-ghost w-full text-sm">Add Question</button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onDone} className="btn-ghost flex-1">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving...' : 'Save Quiz'}</button>
      </div>
    </div>
  );
}

function QuizPlayer({ quiz, onBack, userId, userName }: { quiz: Quiz; onBack: () => void; userId: string; userName: string }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const loadQuestions = async () => {
      const { data } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('created_at', { ascending: true });
      if (data) setQuestions(data as QuizQuestion[]);
      setLoading(false);
    };
    loadQuestions();
  }, [quiz.id]);

  const handleAnswer = (answer: string) => {
    setAnswers((prev) => ({ ...prev, [questions[currentIdx].id]: answer }));
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      const finalScore = questions.reduce((acc, q) => acc + (answers[q.id] === q.correct_answer ? 1 : (answer === q.correct_answer && q.id === questions[currentIdx].id ? 1 : 0)), 0);
      setScore(finalScore);
      setShowResult(true);
      supabase.from('quiz_attempts').insert({ quiz_id: quiz.id, profile_id: userId, profile_name: userName, score: finalScore, total_questions: questions.length });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  if (showResult) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="glass-strong rounded-3xl p-8 text-center animate-slide-up">
          <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-cream">Quiz Complete!</h2>
          <p className="text-lg text-blue-400 mt-2">You scored {score} / {questions.length}</p>
          <button onClick={onBack} className="btn-primary w-full mt-6">Back to Quizzes</button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <p className="text-slate-500 py-20">This quiz has no questions yet.</p>
        <button onClick={onBack} className="btn-primary">Back</button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const options = [
    { key: 'a', text: q.option_a },
    { key: 'b', text: q.option_b },
    { key: 'c', text: q.option_c },
    { key: 'd', text: q.option_d },
  ];

  return (
    <div className="max-w-md mx-auto p-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-cream hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-cream">{quiz.title}</h2>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {questions.map((_, i) => (
          <div key={i} className={`h-2 flex-1 rounded-full ${i < currentIdx ? 'bg-blue-500' : i === currentIdx ? 'nav-gradient' : 'bg-slate-700'}`} />
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-6 animate-fade-in">
        <p className="text-xs text-slate-500 mb-2">Question {currentIdx + 1} of {questions.length}</p>
        <h3 className="text-lg font-semibold text-cream mb-4">{q.question}</h3>
        <div className="space-y-2">
          {options.map((opt) => (
            <button key={opt.key} onClick={() => handleAnswer(opt.key)}
              className="w-full text-left px-4 py-3 rounded-xl glass text-slate-200 hover:bg-slate-800/60 hover:text-cream transition-all duration-200">
              <span className="font-bold text-blue-400 mr-2">{opt.key.toUpperCase()}.</span> {opt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
