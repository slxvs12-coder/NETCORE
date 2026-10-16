import { useState } from 'react';
import { getGetBookmarksQueryKey, getGetDashboardQueryKey, getGetQuizSessionQueryKey, useAddBookmark, useGetBookmarks, useGetQuizSession, useRemoveBookmark } from '@workspace/api-client-react';
import type { QuizResult, QuizSession } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bookmark, Check, CircleCheck, CircleX, ExternalLink, RotateCcw } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { getGuestId, getResult } from '@/lib/guest';
import { LoadingState, PageHeading } from '@/components/shell';

function readResult(id: string): QuizResult | null {
  return getResult(id) as QuizResult | null;
}

function resultFromSession(session: QuizSession | undefined): QuizResult | null {
  if (!session || session.status !== 'completed') return null;
  const answers = session.questions.map(question => {
    const saved = session.answers.find(answer => answer.questionId === question.id);
    const feedback = saved?.feedback;
    return {
      question: {
        ...question,
        correctChoiceIds: feedback?.correctChoiceIds ?? [],
        correctText: feedback?.correctText ?? null,
        explanation: feedback?.explanation ?? '',
      },
      selectedChoiceIds: saved?.selectedChoiceIds ?? [],
      textAnswer: saved?.textAnswer ?? null,
      flagged: saved?.flagged ?? false,
      isCorrect: saved?.isCorrect ?? false,
    };
  });
  const score = answers.filter(answer => answer.isCorrect).length;
  return {
    sessionId: session.id,
    subjectId: session.subjectId,
    mode: session.mode,
    score,
    total: answers.length,
    accuracy: answers.length ? score / answers.length * 100 : 0,
    completedAt: session.completedAt ?? session.startedAt,
    answers,
  };
}

export default function ResultsPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [cachedResult] = useState(() => readResult(sessionId));
  const sessionQuery = useGetQuizSession(sessionId, { query: { enabled: !cachedResult && !!sessionId, queryKey: getGetQuizSessionQueryKey(sessionId) } });
  const result = cachedResult ?? resultFromSession(sessionQuery.data);
  const [openAnswers, setOpenAnswers] = useState(true);
  const guestId = getGuestId();
  const cache = useQueryClient();
  const bookmarks = useGetBookmarks(guestId);
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const bookmarkedIds = new Set((bookmarks.data ?? []).map(item => item.id));
  const toggleBookmark = (questionId: string) => {
    const mutate = bookmarkedIds.has(questionId) ? removeBookmark : addBookmark;
    mutate.mutate({ guestId, questionId }, { onSuccess: () => {
      cache.invalidateQueries({ queryKey: getGetBookmarksQueryKey(guestId) });
      cache.invalidateQueries({ queryKey: getGetDashboardQueryKey(guestId) });
    } });
  };

  if (!result && sessionQuery.isLoading) return <LoadingState />;
  if (!result) return <div><PageHeading eyebrow="Session review" title="Results are not available here" description="This browser does not have a saved result and the session endpoint did not return completed answer feedback. Completed attempts remain available in your dashboard." /><Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><ArrowLeft size={16} /> Return to overview</Link></div>;
  const percent = Math.round(result.accuracy);
  return (
    <div>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-results"><ArrowLeft size={15} /> Overview</Link>
      <PageHeading eyebrow="Session complete" title="A clearer picture of your progress." description={`${result.mode.charAt(0).toUpperCase()}${result.mode.slice(1)} session · ${new Date(result.completedAt).toLocaleString()}`} action={<Link href="/quiz/setup" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold hover:bg-muted" data-testid="link-another-quiz"><RotateCcw size={15} /> Practice again</Link>} />
      <section className="mb-8 grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="relative overflow-hidden rounded-[24px] bg-[#183f42] p-6 text-[#f3f0e6] sm:p-8">
          <div className="absolute -right-9 -top-9 size-44 rounded-full border border-white/10" /><div className="absolute -right-1 -top-1 size-28 rounded-full border border-white/10" />
          <p className="relative text-[10px] font-bold uppercase tracking-[.18em] text-[#e6b65f]">Session score</p>
          <div className="relative mt-5 flex items-end gap-3"><span className="font-display text-6xl font-extrabold tracking-[-.06em]" data-testid="text-score">{result.score}<span className="text-3xl text-white/55">/{result.total}</span></span><span className="mb-2 rounded-lg bg-white/10 px-2 py-1 font-mono text-xs">{percent}%</span></div>
          <p className="relative mt-3 text-sm text-white/70">Correct answers on this attempt</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-5"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><CircleCheck size={18} /></span><p className="mt-4 font-display text-2xl font-extrabold">{result.score}</p><p className="mt-1 text-xs text-muted-foreground">Correct answers</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><span className="grid size-9 place-items-center rounded-xl bg-accent/20 text-foreground"><CircleX size={18} /></span><p className="mt-4 font-display text-2xl font-extrabold">{result.total - result.score}</p><p className="mt-1 text-xs text-muted-foreground">To revisit</p></div>
          <div className="col-span-2 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Accuracy</p><p className="mt-1 text-[11px] text-muted-foreground">For this session only</p></div><span className="font-mono text-xl font-semibold">{percent}%</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} /></div></div>
        </div>
      </section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Answer review</p><h2 className="mt-1 font-display text-xl font-extrabold">Learn from each question</h2></div><button type="button" onClick={() => setOpenAnswers(v => !v)} className="rounded-lg px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10" data-testid="button-toggle-review">{openAnswers ? 'Collapse all' : 'Expand all'}</button></div>
      {openAnswers && <div className="space-y-3">{result.answers.map((answer, i) => {
        const bookmarked = bookmarkedIds.has(answer.question.id);
        const chosen = answer.question.choices.filter(choice => answer.selectedChoiceIds.includes(choice.id));
        return <article key={answer.question.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid={`answer-review-${answer.question.id}`}>
          <div className="flex items-start gap-3"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${answer.isCorrect ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{answer.isCorrect ? <Check size={15} /> : <CircleX size={15} />}</span><div className="min-w-0 flex-1"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Question {i + 1}</span><span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold">{answer.question.topicName}</span><span className="rounded-md border border-accent/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">{answer.question.verified ? 'Reference checked' : 'Seed · unverified'}</span></div><h3 className="text-sm font-semibold leading-relaxed">{answer.question.prompt}</h3></div><button type="button" onClick={() => toggleBookmark(answer.question.id)} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark question'} aria-pressed={bookmarked} className={`grid size-9 shrink-0 place-items-center rounded-lg ${bookmarked ? 'bg-accent/20 text-foreground' : 'text-muted-foreground hover:bg-muted'}`} data-testid={`button-bookmark-${answer.question.id}`}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button></div>
          <div className="ml-10 mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-secondary/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your answer</p><p className="mt-1.5 text-xs leading-relaxed">{chosen.length ? chosen.map(choice => choice.text).join(', ') : answer.textAnswer || 'No answer submitted'}</p></div><div className="rounded-xl bg-primary/5 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Answer to remember</p><p className="mt-1.5 text-xs leading-relaxed">{answer.question.correctChoiceIds.length ? answer.question.choices.filter(choice => answer.question.correctChoiceIds.includes(choice.id)).map(choice => choice.text).join(', ') : answer.question.correctText || 'Answer details were not supplied.'}</p></div></div>
          <div className="ml-10 mt-3 rounded-xl border-l-2 border-accent bg-accent/5 px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-wider">Why</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{answer.question.explanation || 'No explanation was provided for this question.'}</p></div>
          {answer.question.sourceTitle && <a href={answer.question.sourceUrl || undefined} target="_blank" rel="noreferrer" className="ml-10 mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary">{answer.question.sourceTitle}<ExternalLink size={12} /></a>}
        </article>;
      })}</div>}
    </div>
  );
}
