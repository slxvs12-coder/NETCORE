import { useState } from 'react';
import { useCreateQuizSession, useGetAcademyCatalog } from '@workspace/api-client-react';
import type { QuizStartInput } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, Clock3, LoaderCircle } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getGuestId, saveActiveSession } from '@/lib/guest';
import { ErrorState, LoadingState, PageHeading } from '@/components/shell';

const modes: { id: QuizStartInput['mode']; label: string; detail: string }[] = [
  { id: 'quick', label: 'Quick practice', detail: 'A short mixed set to keep concepts fresh.' },
  { id: 'topic', label: 'Topic focus', detail: 'Stay with a selected part of the syllabus.' },
  { id: 'mock', label: 'Mock exam', detail: 'A broader run through the subject question bank.' },
  { id: 'timed', label: 'Timed session', detail: 'Practice pacing with a countdown.' },
  { id: 'custom', label: 'Custom set', detail: 'Choose the length and difficulty yourself.' },
];

export default function QuizSetupPage() {
  const [, setLocation] = useLocation();
  const catalog = useGetAcademyCatalog();
  const createSession = useCreateQuizSession();
  const search = new URLSearchParams(window.location.search);
  const initialSubject = search.get('subject') || 'network-fundamentals';
  const [mode, setMode] = useState<QuizStartInput['mode']>(search.get('topic') ? 'topic' : 'quick');
  const [subjectId, setSubjectId] = useState(initialSubject);
  const [topicId, setTopicId] = useState(search.get('topic') || '');
  const [difficulty, setDifficulty] = useState<QuizStartInput['difficulty']>('mixed');
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(15);
  const [immediateFeedback, setImmediateFeedback] = useState(false);
  const topics = catalog.data?.topics.filter(topic => topic.subjectId === subjectId) ?? [];
  const availableQuestions = catalog.data?.subjects.find(subject => subject.id === subjectId)?.questionCount ?? 0;
  const requestedCount = mode === 'mock' ? Math.min(50, availableQuestions) : count;
  const start = () => {
    const payload: QuizStartInput = {
      guestId: getGuestId(),
      mode,
      subjectId: subjectId as QuizStartInput['subjectId'],
      topicIds: mode === 'topic' && topicId ? [topicId] : [],
      difficulty: mode === 'custom' ? difficulty : 'mixed',
      questionCount: requestedCount,
      timeLimitSeconds: mode === 'timed' ? minutes * 60 : null,
      immediateFeedback,
    };
    createSession.mutate({ data: payload }, {
      onSuccess: session => {
        saveActiveSession(session.id);
        setLocation(`/quiz/${session.id}`);
      },
    });
  };
  if (catalog.isLoading) return <LoadingState />;
  if (catalog.isError) return <ErrorState retry={() => catalog.refetch()} />;

  return (
    <div>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Overview</Link>
      <PageHeading eyebrow="Quiz builder" title="Set up your session" description="Keep it focused or simulate an exam. Your answers are saved as you go." />
      <div className="grid gap-7 lg:grid-cols-[1fr_310px]">
        <div className="space-y-7">
          <section>
            <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-lg font-extrabold">Choose a format</h2><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">01 / Format</span></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {modes.map((item, i) => <button key={item.id} type="button" onClick={() => setMode(item.id)} className={`rounded-2xl border p-4 text-left transition-colors ${mode === item.id ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card hover:border-primary/35'} ${i === 4 ? 'sm:col-span-2' : ''}`} aria-pressed={mode === item.id} data-testid={`button-mode-${item.id}`}><span className="flex items-center justify-between"><span className="font-display text-sm font-bold">{item.label}</span><span className={`size-4 rounded-full border ${mode === item.id ? 'border-[5px] border-primary' : 'border-muted-foreground/50'}`} /></span><span className="mt-1.5 block text-xs text-muted-foreground">{item.detail}</span></button>)}
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-baseline justify-between"><h2 className="font-display text-lg font-extrabold">Build your question set</h2><span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">02 / Scope</span></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold">Subject<select value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(''); }} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" data-testid="select-subject">{catalog.data?.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
              <label className="text-xs font-semibold">Difficulty<select value={difficulty} onChange={e => setDifficulty(e.target.value as QuizStartInput['difficulty'])} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" data-testid="select-difficulty"><option value="mixed">Mixed</option><option value="easy">Foundational</option><option value="medium">Intermediate</option><option value="hard">Advanced</option></select></label>
              {(mode === 'topic' || topicId) && <label className="text-xs font-semibold sm:col-span-2">Topic<select value={topicId} onChange={e => setTopicId(e.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" data-testid="select-topic"><option value="">Choose a topic</option>{topics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select></label>}
              {mode !== 'mock' && <label className="text-xs font-semibold">Number of questions <span className="ml-1 text-muted-foreground">1–50</span><input type="number" min="1" max="50" value={count} onChange={e => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" data-testid="input-question-count" /></label>}
              {mode === 'timed' && <label className="text-xs font-semibold">Time limit<select value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" data-testid="select-time-limit"><option value={5}>5 minutes</option><option value={15}>15 minutes</option><option value={30}>30 minutes</option><option value={45}>45 minutes</option></select></label>}
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl bg-secondary/60 p-4"><input type="checkbox" checked={immediateFeedback} onChange={e => setImmediateFeedback(e.target.checked)} className="mt-0.5 size-4 accent-[hsl(var(--primary))]" data-testid="checkbox-immediate-feedback" /><span><span className="block text-xs font-bold">Show feedback as I answer</span><span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">Correctness and explanation are shown immediately when the API provides them.</span></span></label>
          </section>
          {createSession.isError && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">Session could not be created. Please try again.</p>}
          <button type="button" onClick={start} disabled={createSession.isPending || (mode === 'topic' && !topicId)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" data-testid="button-create-session">{createSession.isPending ? <><LoaderCircle size={16} className="animate-spin" /> Preparing your session</> : <>Start session <ArrowRight size={16} /></>}</button>
        </div>
        <aside className="h-fit rounded-2xl border border-border bg-secondary/55 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-primary">Session preview</p>
          <h3 className="mt-3 font-display text-lg font-extrabold">{modes.find(item => item.id === mode)?.label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{catalog.data?.subjects.find(s => s.id === subjectId)?.name}</p>
          <div className="my-5 space-y-3 border-y border-border py-4 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Question count</span><strong>{requestedCount}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Difficulty</span><strong className="capitalize">{mode === 'custom' ? difficulty : 'Mixed'}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Timer</span><strong className="flex items-center gap-1">{mode === 'timed' ? <><Clock3 size={12} /> {minutes} min</> : 'Off'}</strong></div></div>
          <p className="text-[10px] leading-relaxed text-muted-foreground">The current bank contains {availableQuestions} questions for this subject. A session uses only matching questions that are available.</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">You can leave and return later. The active session is saved to this device and your guest progress is stored with the learning API.</p>
        </aside>
      </div>
    </div>
  );
}
