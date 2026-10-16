import { useGetAcademyCatalog, useGetDashboard, getGetDashboardQueryKey } from '@workspace/api-client-react';
import { ArrowUpRight, BookOpen, CheckCircle2, CircleHelp, Clock3, Flame, Gauge, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { getActiveSession, getGuestId } from '@/lib/guest';
import { ErrorState, LoadingState, PageHeading } from '@/components/shell';

function displaySubject(id: string) {
  return id === 'operating-systems' ? 'Operating Systems' : 'Network Fundamentals';
}

export default function Dashboard() {
  const guestId = getGuestId();
  const dashboard = useGetDashboard(guestId, { query: { queryKey: getGetDashboardQueryKey(guestId), refetchOnMount: 'always' } });
  const catalog = useGetAcademyCatalog();
  if (dashboard.isLoading || catalog.isLoading) return <LoadingState />;
  if (dashboard.isError) return <ErrorState retry={() => dashboard.refetch()} />;
  const data = dashboard.data;
  const activeSession = getActiveSession();

  return (
    <div>
      <PageHeading eyebrow="Your learning space" title="Good to have you here." description="A clear view of what you know, what is next, and the practice that gets you there." action={activeSession ? <Link href={`/quiz/${activeSession}`} className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary" data-testid="link-resume-session"><Clock3 size={16} /> Resume session</Link> : undefined} />
      <section className="relative mb-8 overflow-hidden rounded-[26px] bg-[#183f42] px-6 py-7 text-[#f3f0e6] sm:px-9 sm:py-9">
        <div className="absolute -right-10 -top-16 size-64 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-8 size-48 rounded-full border border-white/10" />
        <div className="relative max-w-xl">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#e6b65f]"><Sparkles size={14} /> Practice with purpose</p>
          <h2 className="font-display text-2xl font-extrabold leading-tight tracking-[-.035em] sm:text-3xl">Make the next concept<br className="hidden sm:block" /> feel familiar.</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">Choose a focused quiz or follow a topic from foundations to confident recall.</p>
          <Link href="/quiz/setup" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#efbd64] px-5 py-3 text-sm font-bold text-[#233438] transition-transform hover:-translate-y-0.5" data-testid="link-start-practice">Build a practice session <ArrowUpRight size={16} /></Link>
        </div>
        <div className="absolute bottom-7 right-8 hidden items-end gap-2 sm:flex" aria-hidden="true">
          <div className="h-12 w-3 rounded-t bg-[#efbd64]/80" /><div className="h-20 w-3 rounded-t bg-[#efbd64]/60" /><div className="h-16 w-3 rounded-t bg-[#efbd64]/40" /><div className="h-28 w-3 rounded-t bg-[#efbd64]" />
          <span className="ml-3 font-mono text-[10px] text-white/50">STEADY PROGRESS</span>
        </div>
      </section>
      <section className="mb-9 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Quizzes completed', value: data?.completedQuizzes, icon: CheckCircle2, note: 'completed sessions' },
          { label: 'Questions answered', value: data?.questionsAnswered, icon: CircleHelp, note: 'across your practice' },
          { label: 'Overall accuracy', value: data && data.questionsAnswered > 0 ? `${Math.round(data.overallAccuracy)}%` : '—', icon: Gauge, note: data && data.questionsAnswered > 0 ? 'based on attempts' : 'no completed answers yet' },
          { label: 'Due for review', value: data?.dueReviewCount, icon: Flame, note: 'ready to revisit' },
        ].map(({ label, value, icon: Icon, note }, index) => (
          <article key={label} className={`animate-in delay-${index + 1} rounded-2xl border border-border bg-card p-4 sm:p-5`} data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-semibold text-muted-foreground">{label}</span><Icon size={16} className="text-primary" /></div>
            <div className="mt-3 font-display text-3xl font-extrabold tracking-tight">{value ?? '—'}</div>
            <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
          </article>
        ))}
      </section>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <section>
          <div className="mb-4 flex items-end justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Course library</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight">Pick up a subject</h2></div>
            <span className="text-xs text-muted-foreground">{catalog.data?.subjects?.length ?? 0} courses</span>
          </div>
          <div className="space-y-3">
            {(catalog.data?.subjects ?? []).map((subject, index) => (
              <Link href={`/subjects/${subject.id}`} key={subject.id} className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:p-5" data-testid={`card-subject-${subject.id}`}>
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${index === 0 ? 'bg-primary/10 text-primary' : 'bg-accent/20 text-foreground'}`}><BookOpen size={20} /></span>
                <span className="min-w-0 flex-1"><span className="block font-display text-[15px] font-bold">{subject.name}</span><span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">{subject.description}</span></span>
                <span className="hidden text-right sm:block"><span className="block text-sm font-bold">{subject.questionCount}</span><span className="text-[10px] text-muted-foreground">questions</span></span>
                <ArrowUpRight size={17} className="text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
            {!catalog.isLoading && !catalog.data?.subjects?.length && <div className="rounded-2xl border border-dashed border-border p-7 text-sm text-muted-foreground">Course subjects will appear here when the catalog is available.</div>}
          </div>
        </section>
        <section>
          <div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Your signal</p><h2 className="mt-1 font-display text-xl font-extrabold tracking-tight">Topics to strengthen</h2></div>
          <div className="rounded-2xl border border-border bg-card p-5">
            {data?.weakAreas?.length ? <div className="space-y-5">{data.weakAreas.slice(0, 4).map(topic => <div key={topic.topicId} data-testid={`weak-topic-${topic.topicId}`}><div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{topic.topicName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{displaySubject(topic.subjectId)} · {topic.attempted} attempted</p></div><span className="font-mono text-xs font-semibold">{Math.round(topic.accuracy)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.max(0, topic.accuracy))}%` }} /></div></div>)}</div> : data?.topicMastery?.length ? <div className="py-5 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><Gauge size={19} /></span><p className="mt-3 text-sm font-semibold">No practiced topic is below 70%</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Your current topic results are holding steady. Keep practicing to strengthen the signal.</p></div> : <div className="py-5 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><Gauge size={19} /></span><p className="mt-3 text-sm font-semibold">Your map is just beginning</p><p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Complete a few questions to see topic-level signals and what is worth revisiting.</p></div>}
            <Link href="/review" className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs font-bold text-primary" data-testid="link-open-review">Open review desk <ArrowUpRight size={15} /></Link>
          </div>
          <div className="mt-4 rounded-2xl bg-secondary/70 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Recent sessions</p>
            {data?.recentAttempts?.length ? <div className="mt-3 space-y-2">{data.recentAttempts.slice(0, 3).map(attempt => <Link key={attempt.id} href={`/results/${attempt.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-background/70 px-3 py-3 text-xs" data-testid={`recent-attempt-${attempt.id}`}><span className="min-w-0"><span className="block truncate font-semibold">{displaySubject(attempt.subjectId)}</span><span className="mt-1 block text-[10px] text-muted-foreground">{attempt.mode} · {new Date(attempt.completedAt).toLocaleDateString()}</span></span><span className="font-mono font-semibold">{attempt.score}/{attempt.total}</span></Link>)}</div> : <p className="mt-3 text-xs text-muted-foreground">Completed attempts will be listed here.</p>}
          </div>
        </section>
      </div>
      {data?.questionsAnswered ? <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="difficulty-mastery-heading">
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Performance by difficulty</p><h2 id="difficulty-mastery-heading" className="mt-1 font-display text-xl font-extrabold tracking-tight">Where practice feels hardest</h2></div>
        <div className="grid gap-4 sm:grid-cols-3">
          {data.difficultyMastery.map(item => <div key={item.difficulty} data-testid={`difficulty-mastery-${item.difficulty}`}>
            <div className="mb-2 flex items-center justify-between gap-2"><span className="text-sm font-semibold capitalize">{item.difficulty}</span><span className="font-mono text-xs">{Math.round(item.accuracy)}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, item.accuracy))}%` }} /></div>
            <p className="mt-2 text-[10px] text-muted-foreground">{item.correct} correct of {item.attempted} attempted</p>
          </div>)}
        </div>
      </section> : null}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-6" aria-labelledby="topic-mastery-heading">
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Learning map</p><h2 id="topic-mastery-heading" className="mt-1 font-display text-xl font-extrabold tracking-tight">Topic mastery</h2><p className="mt-1 text-xs text-muted-foreground">Only topics with completed answers appear here.</p></div>
        {data?.topicMastery?.length ? <div className="grid gap-4 sm:grid-cols-2">
          {[...data.topicMastery].sort((a, b) => b.attempted - a.attempted).slice(0, 8).map(topic => <div key={topic.topicId} data-testid={`topic-mastery-${topic.topicId}`}>
            <div className="mb-2 flex items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{topic.topicName}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{displaySubject(topic.subjectId)} · {topic.attempted} attempted</p></div><span className="font-mono text-xs font-semibold">{Math.round(topic.accuracy)}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, topic.accuracy))}%` }} /></div>
          </div>)}
        </div> : <div className="rounded-xl bg-secondary/50 p-4 text-xs text-muted-foreground">Complete a quiz to start building a topic-by-topic record.</div>}
      </section>
    </div>
  );
}
