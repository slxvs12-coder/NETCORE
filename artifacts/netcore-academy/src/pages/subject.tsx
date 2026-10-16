import { useGetAcademyCatalog } from '@workspace/api-client-react';
import { ArrowLeft, ArrowUpRight, BookOpenCheck, CircleHelp, Layers3 } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { ErrorState, LoadingState, PageHeading } from '@/components/shell';
import curriculumOrder from '@/data/curriculum-order.json';

export default function SubjectPage() {
  const params = useParams<{ subjectId: string }>();
  const catalog = useGetAcademyCatalog();
  if (catalog.isLoading) return <LoadingState />;
  if (catalog.isError) return <ErrorState retry={() => catalog.refetch()} />;
  const subject = catalog.data?.subjects.find(item => item.id === params.subjectId);
  const topics = (catalog.data?.topics.filter(topic => topic.subjectId === params.subjectId) ?? []).sort((a, b) => {
    const aOrder = curriculumOrder.find(item => item.id === a.id)?.order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = curriculumOrder.find(item => item.id === b.id)?.order ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
  if (!subject) return <div className="rounded-2xl border border-border bg-card p-8"><h1 className="font-display text-2xl font-bold">Subject not found</h1><p className="mt-2 text-sm text-muted-foreground">This subject is not part of the current catalog.</p><Link href="/" className="mt-4 inline-flex gap-2 text-sm font-bold text-primary"><ArrowLeft size={16} /> Return to overview</Link></div>;
  return (
    <div>
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-dashboard"><ArrowLeft size={15} /> Overview</Link>
      <PageHeading eyebrow="Subject guide" title={subject.name} description={subject.description} action={<Link href={`/quiz/setup?subject=${subject.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-subject-quiz"><BookOpenCheck size={16} /> Start subject quiz</Link>} />
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Question bank</p><p className="mt-2 font-display text-3xl font-extrabold">{subject.questionCount}</p><p className="mt-1 text-xs text-muted-foreground">available questions</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Study sections</p><p className="mt-2 font-display text-3xl font-extrabold">{topics.length}</p><p className="mt-1 text-xs text-muted-foreground">topics in this subject</p></div>
        <div className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">A good place to start</p><p className="mt-3 flex items-center gap-2 text-sm font-semibold"><Layers3 size={17} className="text-primary" /> Work topic by topic</p><p className="mt-1 text-xs text-muted-foreground">Build understanding before a mock exam.</p></div>
      </div>
      <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Syllabus</p><h2 className="mt-1 font-display text-xl font-extrabold">Topics in this subject</h2></div><span className="text-xs text-muted-foreground">Choose a topic to focus practice</span></div>
      {topics.length ? <div className="grid gap-3 lg:grid-cols-2">{topics.map((topic, i) => <article key={topic.id} className="animate-in rounded-2xl border border-border bg-card p-5" style={{ animationDelay: `${i * 55}ms` }} data-testid={`topic-card-${topic.id}`}><div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><span className="font-mono text-xs font-semibold">{String(i + 1).padStart(2, '0')}</span></span><div className="min-w-0 flex-1"><h3 className="font-display text-base font-bold">{topic.name}</h3><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{topic.description}</p><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><CircleHelp size={13} /> {topic.questionCount} questions</span><div className="flex flex-wrap items-center gap-2"><Link href={`/subjects/${subject.id}/lessons/${topic.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted" data-testid={`link-study-topic-${topic.id}`}>Study lesson <BookOpenCheck size={14} /></Link><Link href={`/quiz/setup?subject=${subject.id}&topic=${topic.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/15" data-testid={`link-practice-topic-${topic.id}`}>Practice topic <ArrowUpRight size={14} /></Link></div></div></div></div></article>)}</div> : <div className="rounded-2xl border border-dashed border-border p-8 text-center"><p className="font-semibold">No topics are listed yet</p><p className="mt-1 text-xs text-muted-foreground">The catalog does not currently provide sections for this subject.</p></div>}
    </div>
  );
}
