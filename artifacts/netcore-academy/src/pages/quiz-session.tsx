import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetDashboardQueryKey, getGetBookmarksQueryKey, getGetReviewQueueQueryKey, getGetQuizSessionQueryKey, useGetQuizSession, useSaveQuizAnswer, useSubmitQuizSession } from '@workspace/api-client-react';
import type { SavedAnswer } from '@workspace/api-client-react';
import { ArrowLeft, ArrowRight, Bookmark, Check, Clock3, Flag, LoaderCircle, Send, Wifi } from 'lucide-react';
import { Link, useLocation, useParams } from 'wouter';
import { clearActiveSession, getGuestId, saveResult } from '@/lib/guest';
import { ErrorState, LoadingState } from '@/components/shell';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function QuizSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const cache = useQueryClient();
  const sessionQuery = useGetQuizSession(sessionId, { query: { enabled: !!sessionId, queryKey: getGetQuizSessionQueryKey(sessionId), refetchOnMount: 'always' } });
  const saveAnswer = useSaveQuizAnswer();
  const submitSession = useSubmitQuizSession();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [feedback, setFeedback] = useState<SavedAnswer['feedback']>(null);
  const [initializedId, setInitializedId] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const expirationSubmitted = useRef(false);
  const session = sessionQuery.data;
  const questions = session?.questions ?? [];
  const question = questions[index];
  const answers = useMemo(() => session?.answers ?? [], [session?.answers]);

  useEffect(() => {
    if (!session || initializedId === session.id) return;
    const saved = session.answers[0];
    setSelected(saved?.selectedChoiceIds ?? []);
    setText(saved?.textAnswer ?? '');
    setFlagged(saved?.flagged ?? false);
    setFeedback(saved?.feedback ?? null);
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    setSecondsRemaining(session.timeLimitSeconds === null ? null : Math.max(0, session.timeLimitSeconds - elapsed));
    setInitializedId(session.id);
  }, [session, initializedId]);

  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const timer = window.setInterval(() => setSecondsRemaining(value => value === null ? null : Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining === null || secondsRemaining <= 0]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight') setIndex(value => Math.min(questions.length - 1, value + 1));
      if (event.key === 'ArrowLeft') setIndex(value => Math.max(0, value - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [questions.length]);

  useEffect(() => {
    if (!question || !session || initializedId !== session.id) return;
    const saved = answers.find(item => item.questionId === question.id);
    setSelected(saved?.selectedChoiceIds ?? []);
    setText(saved?.textAnswer ?? '');
    setFlagged(saved?.flagged ?? false);
    setFeedback(saved?.feedback ?? null);
  }, [index, session?.id, initializedId]);

  const persist = (nextSelected: string[], nextText: string, nextFlagged: boolean) => {
    if (!question || !session) return;
    setFeedback(null);
    saveAnswer.mutate({ sessionId: session.id, data: { guestId: getGuestId(), questionId: question.id, selectedChoiceIds: nextSelected, textAnswer: nextText.trim() ? nextText : null, flagged: nextFlagged } }, {
      onSuccess: result => {
        setFeedback(result.feedback);
        cache.setQueryData(getGetQuizSessionQueryKey(session.id), (old: typeof session | undefined) => old ? {
          ...old,
          answers: [...old.answers.filter(item => item.questionId !== result.questionId), result],
        } : old);
      },
    });
  };

  const setChoice = (choiceId: string) => {
    if (!question) return;
    const next = question.type === 'multiple_select' ? (selected.includes(choiceId) ? selected.filter(id => id !== choiceId) : [...selected, choiceId]) : [choiceId];
    setSelected(next);
    persist(next, text, flagged);
  };

  const toggleFlag = () => {
    const next = !flagged;
    setFlagged(next);
    persist(selected, text, next);
  };

  const submit = () => {
    if (!session || submitSession.isPending) return;
    submitSession.mutate({ sessionId: session.id, data: { guestId: getGuestId() } }, {
      onSuccess: result => {
        saveResult(session.id, result);
        clearActiveSession(session.id);
        cache.invalidateQueries({ queryKey: getGetDashboardQueryKey(getGuestId()) });
        cache.invalidateQueries({ queryKey: getGetReviewQueueQueryKey(getGuestId()) });
        cache.invalidateQueries({ queryKey: getGetBookmarksQueryKey(getGuestId()) });
        cache.invalidateQueries({ queryKey: getGetQuizSessionQueryKey(session.id) });
        setLocation(`/results/${session.id}`);
      },
    });
  };

  useEffect(() => {
    if (
      secondsRemaining === 0
      && session?.status === 'in_progress'
      && !submitSession.isPending
      && !expirationSubmitted.current
    ) {
      expirationSubmitted.current = true;
      submit();
    }
  }, [secondsRemaining, session?.status, submitSession.isPending]);

  if (sessionQuery.isLoading) return <LoadingState />;
  if (sessionQuery.isError) return <ErrorState retry={() => sessionQuery.refetch()} message="This saved session could not be restored." />;
  if (!session || !question) return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-xl font-bold">No questions in this session</h1><p className="mt-2 text-sm text-muted-foreground">The session did not return any questions to answer.</p><Link href="/" className="mt-4 inline-flex text-sm font-bold text-primary">Return to overview</Link></div>;
  if (session.status === 'completed') return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-xl font-bold">This session is complete</h1><Link href={`/results/${session.id}`} className="mt-4 inline-flex text-sm font-bold text-primary">Open results</Link></div>;

  const answeredCount = answers.filter(answer => answer.selectedChoiceIds.length || answer.textAnswer?.trim()).length;
  const completion = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="mx-auto max-w-[950px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="link-leave-quiz"><ArrowLeft size={15} /> Leave session</Link>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Wifi size={13} className="text-primary" /> Saved as you go</span>{session.timeLimitSeconds !== null && <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono font-semibold ${secondsRemaining === 0 ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-foreground'}`}><Clock3 size={13} />{formatTime(secondsRemaining ?? session.timeLimitSeconds)}</span>}</div>
      </div>
      <div className="mb-6 flex items-center gap-4">
        <div className="flex-1"><div className="mb-2 flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><span>{session.mode} session</span><span>{index + 1} of {questions.length}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div></div>
        <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">{answeredCount} answered</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_230px]">
        <section className="min-w-0 rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="mb-7 flex items-start justify-between gap-3">
            <div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">{question.topicName}</span><span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold capitalize text-muted-foreground">{question.difficulty}</span><span className="text-[10px] text-muted-foreground">{question.type.replaceAll('_', ' ')}</span><span className="rounded-md border border-accent/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">{question.verified ? 'Reference checked' : 'Seed · unverified'}</span></div><p className="text-xs text-muted-foreground">Question {index + 1}</p></div>
            <button type="button" onClick={toggleFlag} aria-pressed={flagged} aria-label={flagged ? 'Remove flag from question' : 'Flag question for review'} className={`grid size-10 shrink-0 place-items-center rounded-xl border ${flagged ? 'border-accent bg-accent/20 text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`} data-testid="button-flag-question"><Flag size={17} fill={flagged ? 'currentColor' : 'none'} /></button>
          </div>
          <h1 className="font-display text-xl font-bold leading-relaxed tracking-[-.02em] sm:text-[23px]" data-testid={`question-prompt-${question.id}`}>{question.prompt}</h1>
          {question.objective && <p className="mt-3 border-l-2 border-accent pl-3 text-xs leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">Learning objective</span> · {question.objective}</p>}
          {question.sourceTitle && <a href={question.sourceUrl || undefined} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary">{question.sourceTitle}</a>}
          {question.choices.length > 0 ? <div className="mt-7 space-y-2.5" role={question.type === 'multiple_select' ? 'group' : 'radiogroup'} aria-label="Answer choices">{question.type === 'multiple_select' && <p className="mb-2 text-[11px] text-muted-foreground">Select all that apply.</p>}{question.choices.map((choice, i) => {
            const active = selected.includes(choice.id);
            return <button type="button" key={choice.id} onClick={() => setChoice(choice.id)} aria-pressed={active} className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors sm:p-4 ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/35 hover:bg-secondary/40'}`} data-testid={`choice-${choice.id}`}><span className={`grid size-7 shrink-0 place-items-center rounded-lg border text-[10px] font-bold ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>{question.type === 'multiple_select' ? active ? <Check size={14} /> : '' : String.fromCharCode(65 + i)}</span><span className="text-sm leading-relaxed">{choice.text}</span></button>;
          })}</div> : <label className="mt-7 block text-xs font-semibold">Your answer<textarea value={text} onChange={e => { setText(e.target.value); persist(selected, e.target.value, flagged); }} rows={4} placeholder="Write a concise answer…" className="mt-2 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm font-normal" data-testid="input-text-answer" /></label>}
          {feedback && session.immediateFeedback && <div className={`mt-5 rounded-xl border p-4 ${feedback.isCorrect ? 'border-primary/25 bg-primary/5' : 'border-accent/40 bg-accent/10'}`} role="status"><p className="text-sm font-bold">{feedback.isCorrect ? 'That is correct.' : 'Not quite yet.'}</p>{feedback.explanation && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feedback.explanation}</p>}</div>}
          {saveAnswer.isError && <p className="mt-4 text-xs text-destructive" role="alert">Answer did not save. You can select it again to retry.</p>}
          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
            <button type="button" disabled={index === 0} onClick={() => setIndex(v => Math.max(0, v - 1))} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold disabled:opacity-40" data-testid="button-previous-question"><ArrowLeft size={15} /> Previous</button>
            {index < questions.length - 1 ? <button type="button" onClick={() => setIndex(v => Math.min(questions.length - 1, v + 1))} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground" data-testid="button-next-question">Next question <ArrowRight size={15} /></button> : <button type="button" onClick={submit} disabled={submitSession.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60" data-testid="button-submit-quiz">{submitSession.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Submit session</button>}
          </div>
          {submitSession.isError && <p className="mt-3 text-xs text-destructive" role="alert">Could not submit this session yet. Your saved answers are still here.</p>}
        </section>
        <aside className="h-fit rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between"><h2 className="text-xs font-bold">Question map</h2><span className="text-[10px] text-muted-foreground">{completion}% done</span></div>
          <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
            {questions.map((item, i) => {
              const answer = answers.find(value => value.questionId === item.id);
              const answered = Boolean(answer?.selectedChoiceIds.length || answer?.textAnswer?.trim());
              const isFlagged = answer?.flagged || (item.id === question.id && flagged);
              return <button key={item.id} type="button" onClick={() => setIndex(i)} aria-label={`Go to question ${i + 1}${answered ? ', answered' : ''}${isFlagged ? ', flagged' : ''}`} aria-current={i === index ? 'step' : undefined} className={`relative grid aspect-square place-items-center rounded-lg border text-[11px] font-semibold ${i === index ? 'border-primary bg-primary text-primary-foreground' : answered ? 'border-primary/20 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'}`} data-testid={`button-question-${i + 1}`}>{i + 1}{isFlagged && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent" />}</button>;
            })}
          </div>
          <div className="mt-5 space-y-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><p className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /> Answered</p><p className="flex items-center gap-2"><span className="size-2 rounded-full bg-accent" /> Flagged</p><p className="flex items-center gap-2"><span className="size-2 rounded-full border border-border" /> Not answered</p></div>
          {index === questions.length - 1 && <button type="button" onClick={submit} disabled={submitSession.isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-xs font-bold text-primary-foreground disabled:opacity-60" data-testid="button-finish-session">{submitSession.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Bookmark size={15} />} Finish and review</button>}
        </aside>
      </div>
    </div>
  );
}
