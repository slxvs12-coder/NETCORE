import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetBookmarksQueryKey, getGetDashboardQueryKey, getGetReviewQueueQueryKey, useAddBookmark, useCreateQuizSession, useGetBookmarks, useGetReviewQueue, useRemoveBookmark } from '@workspace/api-client-react';
import type { Question, ReviewedQuestion } from '@workspace/api-client-react';
import { Bookmark, Check, ExternalLink, RotateCcw } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getGuestId } from '@/lib/guest';
import { ErrorState, LoadingState, PageHeading } from '@/components/shell';

type ReviewQuestion = ReviewedQuestion | Question;

export default function ReviewPage() {
  const guestId = getGuestId();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'due' | 'bookmarks'>('due');
  const queue = useGetReviewQueue(guestId, { query: { queryKey: getGetReviewQueueQueryKey(guestId), refetchOnMount: 'always' } });
  const bookmarks = useGetBookmarks(guestId, { query: { queryKey: getGetBookmarksQueryKey(guestId), refetchOnMount: 'always' } });
  const createReview = useCreateQuizSession();
  const cache = useQueryClient();
  const addBookmark = useAddBookmark();
  const removeBookmark = useRemoveBookmark();
  const list: ReviewQuestion[] = tab === 'due' ? (queue.data?.questions ?? []) : (bookmarks.data ?? []);
  const bookmarkedIds = new Set((bookmarks.data ?? []).map(item => item.id));
  const toggle = (id: string) => {
    const mutation = bookmarkedIds.has(id) ? removeBookmark : addBookmark;
    mutation.mutate({ guestId, questionId: id }, { onSuccess: () => {
      cache.invalidateQueries({ queryKey: getGetBookmarksQueryKey(guestId) });
      cache.invalidateQueries({ queryKey: getGetDashboardQueryKey(guestId) });
    } });
  };
  const startReviewQuiz = () => {
    const dueQuestions = queue.data?.questions ?? [];
    const subjectId = dueQuestions[0]?.subjectId;
    if (!subjectId) return;
    const eligibleCount = dueQuestions.filter(question => question.subjectId === subjectId).length;
    createReview.mutate({
      data: {
        guestId,
        mode: 'review',
        subjectId: subjectId as 'network-fundamentals' | 'operating-systems',
        topicIds: [],
        difficulty: 'mixed',
        questionCount: Math.min(50, eligibleCount),
        timeLimitSeconds: null,
        immediateFeedback: false,
      },
    }, {
      onSuccess: session => setLocation(`/quiz/${session.id}`),
    });
  };
  if (queue.isLoading || bookmarks.isLoading) return <LoadingState />;
  if (queue.isError || bookmarks.isError) return <ErrorState retry={() => { queue.refetch(); bookmarks.refetch(); }} />;
  return (
    <div>
      <PageHeading eyebrow="Retrieval practice" title="Review what matters." description="Questions due for another look, alongside the ones you have saved for later." action={<button type="button" onClick={startReviewQuiz} disabled={!queue.data?.questions.length || createReview.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-start-review-quiz"><RotateCcw size={15} /> {createReview.isPending ? 'Preparing review' : 'Quiz due questions'}</button>} />
      {createReview.isError && <p className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive" role="alert">Could not create a review quiz. Your saved progress is unchanged.</p>}
      <div className="mb-6 flex gap-2 border-b border-border" role="tablist" aria-label="Review collections">
        <button type="button" onClick={() => setTab('due')} role="tab" aria-selected={tab === 'due'} className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === 'due' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} data-testid="tab-due">Due & missed <span className="ml-1 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{queue.data?.questions.length ?? 0}</span></button>
        <button type="button" onClick={() => setTab('bookmarks')} role="tab" aria-selected={tab === 'bookmarks'} className={`border-b-2 px-4 py-3 text-xs font-bold ${tab === 'bookmarks' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`} data-testid="tab-bookmarks">Bookmarks <span className="ml-1 rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{bookmarks.data?.length ?? 0}</span></button>
      </div>
      {list.length ? <div className="grid gap-3 lg:grid-cols-2">{list.map((question, i) => {
        const reviewed = 'explanation' in question ? question : null;
        const saved = bookmarkedIds.has(question.id);
        return <article key={question.id} className="animate-in rounded-2xl border border-border bg-card p-5" style={{ animationDelay: `${i * 45}ms` }} data-testid={`review-question-${question.id}`}>
          <div className="mb-3 flex items-center justify-between gap-2"><span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">{question.topicName}</span><div className="flex items-center gap-2"><span className="rounded-md border border-accent/40 px-2 py-1 text-[10px] font-semibold text-muted-foreground">{question.verified ? 'Reference checked' : 'Seed · unverified'}</span><button type="button" onClick={() => toggle(question.id)} aria-pressed={saved} aria-label={saved ? 'Remove bookmark' : 'Add bookmark'} className={`grid size-8 place-items-center rounded-lg ${saved ? 'bg-accent/20 text-foreground' : 'text-muted-foreground hover:bg-muted'}`} data-testid={`button-toggle-bookmark-${question.id}`}><Bookmark size={15} fill={saved ? 'currentColor' : 'none'} /></button></div></div>
          <h2 className="text-sm font-semibold leading-relaxed">{question.prompt}</h2>
          {question.choices.length > 0 && <div className="mt-3 space-y-1.5">{question.choices.map(choice => <p key={choice.id} className="rounded-lg bg-secondary/55 px-3 py-2 text-xs">{choice.text}</p>)}</div>}
          {reviewed && <details className="mt-4 rounded-xl border border-border bg-background p-3"><summary className="cursor-pointer text-xs font-bold text-primary">Reveal answer and explanation</summary><div className="mt-3 space-y-2 text-xs"><p><span className="font-semibold">Answer:</span> {reviewed.correctChoiceIds.length ? reviewed.choices.filter(choice => reviewed.correctChoiceIds.includes(choice.id)).map(choice => choice.text).join(', ') : reviewed.correctText || 'Not supplied'}</p><p className="leading-relaxed text-muted-foreground">{reviewed.explanation}</p></div></details>}
          {question.sourceTitle && <a href={question.sourceUrl || undefined} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary">{question.sourceTitle}<ExternalLink size={12} /></a>}
          <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground"><Check size={12} /> {question.difficulty} · {question.type.replaceAll('_', ' ')}</p>
        </article>;
      })}</div> : <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground"><Bookmark size={20} /></span><h2 className="mt-4 font-display text-lg font-bold">{tab === 'due' ? 'Nothing due right now' : 'Your bookmark shelf is clear'}</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">{tab === 'due' ? 'Missed or difficult questions will be collected here when your progress marks them for another look.' : 'Bookmark questions during answer review to keep important concepts close.'}</p><Link href="/quiz/setup" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">Practice a subject <RotateCcw size={14} /></Link></div>}
    </div>
  );
}
