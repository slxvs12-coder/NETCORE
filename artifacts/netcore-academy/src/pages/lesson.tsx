import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, BookOpenCheck, Check,
  CheckCircle2, CircleHelp, Clock3, ExternalLink, Lightbulb, ListChecks,
  RotateCcw, Target, Terminal, TriangleAlert,
} from 'lucide-react';
import { Link, useParams } from 'wouter';
import { PageHeading } from '@/components/shell';
import lessonsData from '@/data/lessons.json';
import curriculumOrder from '@/data/curriculum-order.json';

type Lesson = (typeof lessonsData)[number];
type AnswerMap = Record<number, string>;

function readCompletedLessons(): string[] {
  try {
    const stored = localStorage.getItem('netcore-completed-lessons');
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default function LessonPage() {
  const params = useParams<{ subjectId: string; lessonId: string }>();
  const lesson = lessonsData.find(item => item.id === params.lessonId && item.subjectId === params.subjectId) as Lesson | undefined;
  const subjectLessons = useMemo(
    () => lessonsData.filter(item => item.subjectId === params.subjectId).sort((a, b) => a.curriculumOrder - b.curriculumOrder),
    [params.subjectId],
  );
  const lessonIndex = subjectLessons.findIndex(item => item.id === lesson?.id);
  const previous = lessonIndex > 0 ? subjectLessons[lessonIndex - 1] : undefined;
  const next = lessonIndex >= 0 && lessonIndex < subjectLessons.length - 1 ? subjectLessons[lessonIndex + 1] : undefined;
  const curriculumItem = curriculumOrder.find(item => item.id === lesson?.id);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitted, setSubmitted] = useState(false);
  const [showIncomplete, setShowIncomplete] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>(readCompletedLessons);

  const score = lesson ? lesson.quickCheck.reduce((total, item, index) => total + Number(answers[index] === item.correctOptionId), 0) : 0;
  const allAnswered = lesson ? lesson.quickCheck.every((_, index) => Boolean(answers[index])) : false;
  const completed = Boolean(lesson && completedLessons.includes(lesson.id));

  function chooseAnswer(questionIndex: number, optionId: string) {
    if (submitted) return;
    setAnswers(current => ({ ...current, [questionIndex]: optionId }));
    setShowIncomplete(false);
  }

  function submitKnowledgeCheck() {
    if (!lesson) return;
    if (!allAnswered) {
      setShowIncomplete(true);
      return;
    }
    setSubmitted(true);
    const updated = [...new Set([...completedLessons, lesson.id])];
    setCompletedLessons(updated);
    try {
      localStorage.setItem('netcore-completed-lessons', JSON.stringify(updated));
    } catch {
      // The quiz still works if local storage is unavailable; progress just will not persist.
    }
  }

  function retryKnowledgeCheck() {
    setAnswers({});
    setSubmitted(false);
    setShowIncomplete(false);
  }

  if (!lesson) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="font-display text-2xl font-bold">Lesson not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This lesson is not part of the selected subject. Check that the question bank and topic catalog have been imported.</p>
        <Link href={`/subjects/${params.subjectId}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft size={16} /> Return to subject</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href={`/subjects/${lesson.subjectId}`} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground" data-testid="link-back-subject"><ArrowLeft size={15} /> Subject guide</Link>
      <PageHeading
        eyebrow={`Lesson ${String(lessonIndex + 1).padStart(2, '0')} of ${subjectLessons.length} · ${lesson.subjectId === 'network-fundamentals' ? 'Computer Networking' : 'Operating Systems & Linux'}`}
        title={lesson.title}
        description={lesson.description}
        action={<Link href={`/quiz/setup?subject=${lesson.subjectId}&topic=${lesson.id}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="link-lesson-practice"><BookOpenCheck size={16} /> Practice this topic</Link>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><Clock3 size={13} /> {lesson.estimatedMinutes} min</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><BookOpen size={13} /> {lesson.sections.length} learning sections</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5"><ListChecks size={13} /> 3-question knowledge check</span>
        {completed && <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-primary"><CheckCircle2 size={13} /> Completed on this device</span>}
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Target size={19} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold">Start with the big picture</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{lesson.intro}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Learning objectives</h3>
            <ul className="mt-3 space-y-2.5">
              {lesson.learningObjectives.map((objective, index) => <li key={objective} className="flex items-start gap-2 text-sm leading-relaxed"><Check size={15} className="mt-0.5 shrink-0 text-primary" /><span>{objective}</span></li>)}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Suggested prerequisites</h3>
            <ul className="mt-3 space-y-2.5">
              {lesson.prerequisites.map(item => <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><ArrowRight size={14} className="mt-1 shrink-0" /><span>{item}</span></li>)}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">You can still study this lesson without completing the prerequisites first. Follow the links back to related topics whenever you need more context.</p>
          </div>
        </div>
      </section>

      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Core concepts</p>
          <h2 className="mt-1 font-display text-xl font-extrabold">Build the understanding</h2>
        </div>
        <span className="text-xs text-muted-foreground">Read in order</span>
      </div>
      <div className="space-y-3">
        {lesson.sections.map((section, index) => (
          <article key={section.title} className="rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid={`lesson-section-${index + 1}`}>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary font-mono text-xs font-bold text-primary">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-extrabold">{section.title}</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-7">{section.explanation}</p>
                <div className="mt-4 rounded-xl bg-muted/60 p-4">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-primary"><Lightbulb size={13} /> How to reason about it</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.howItWorks}</p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Example</p>
                    <p className="mt-2 text-sm leading-6">{section.example}</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">Expected reasoning: </span>{section.outcome}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-amber-700 dark:text-amber-300"><TriangleAlert size={13} /> Common misconception</p>
                    <p className="mt-2 text-sm leading-6">{section.commonMisconception}</p>
                  </div>
                </div>
                <p className="mt-4 border-l-2 border-primary/50 pl-3 text-sm leading-6 text-muted-foreground">{section.takeaway}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><BookOpenCheck size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Worked example</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">{lesson.workedExample.title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{lesson.workedExample.context}</p>
            <ol className="mt-4 space-y-3">
              {lesson.workedExample.steps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[10px] font-bold text-primary">{index + 1}</span><span>{step}</span></li>)}
            </ol>
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Conclusion</p><p className="mt-2 text-sm leading-6">{lesson.workedExample.result}</p></div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Terminal size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Practice activity</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">{lesson.activity.title}</h2>
            <ol className="mt-4 space-y-3">
              {lesson.activity.steps.map((step, index) => <li key={step} className="flex items-start gap-3 text-sm leading-6"><span className="grid size-6 shrink-0 place-items-center rounded-full border border-border font-mono text-[10px] font-bold text-muted-foreground">{index + 1}</span><span>{step}</span></li>)}
            </ol>
            {lesson.activity.external && <div className="mt-4 rounded-xl bg-muted/60 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">External practice / notes</p><p className="mt-2 break-words text-sm leading-6">{lesson.activity.external}</p></div>}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><TriangleAlert size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold">Mistakes to avoid</h2>
            <ul className="mt-3 space-y-2.5">
              {lesson.commonMistakes.map(item => <li key={item} className="flex items-start gap-2 text-sm leading-6 text-muted-foreground"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><BookOpen size={18} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-extrabold">Technical vocabulary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {lesson.glossary.map(item => <div key={item.term} className="rounded-xl border border-border p-3"><h3 className="text-sm font-bold">{item.term}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.definition}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6" data-testid="lesson-knowledge-check">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><CircleHelp size={19} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Knowledge check</p>
            <h2 className="mt-1 font-display text-xl font-extrabold">Check your understanding</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose an answer for every question. Correct answers and explanations appear only after you submit the full check.</p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          {lesson.quickCheck.map((question, index) => (
            <div key={question.prompt} className="rounded-xl border border-border p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary font-mono text-[10px] font-bold text-primary">{index + 1}</span>
                <h3 className="text-sm font-semibold leading-6">{question.prompt}</h3>
              </div>
              <div className="mt-3 space-y-2 pl-0 sm:pl-10">
                {question.options.map(option => {
                  const selected = answers[index] === option.id;
                  const correct = option.id === question.correctOptionId;
                  const statusClass = submitted ? (correct ? 'border-primary bg-primary/5' : selected ? 'border-destructive bg-destructive/5' : 'border-border') : selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40';
                  return <button key={option.id} type="button" onClick={() => chooseAnswer(index, option.id)} disabled={submitted} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm leading-6 transition-colors disabled:cursor-default ${statusClass}`} aria-pressed={selected}>
                    <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${selected ? (submitted && !correct ? 'border-destructive bg-destructive text-destructive-foreground' : 'border-primary bg-primary text-primary-foreground') : 'border-muted-foreground/50'}`}>{selected && <span className="size-1.5 rounded-full bg-current" />}</span>
                    <span className="flex-1">{option.text}</span>
                    {submitted && correct && <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />}
                  </button>;
                })}
              </div>
              {submitted && <div className="mt-3 rounded-lg bg-muted/60 p-3 sm:ml-10"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-primary">Explanation</p><p className="mt-1 text-sm leading-6">{question.explanation}</p></div>}
            </div>
          ))}
        </div>
        {showIncomplete && <p className="mt-4 text-sm font-medium text-destructive" role="alert">Answer all three questions before submitting.</p>}
        {submitted ? (
          <div className="mt-5 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Knowledge-check result</p><p className="mt-1 font-display text-2xl font-extrabold">{score} / {lesson.quickCheck.length}</p></div>
              {score < 2 ? <span className="text-sm text-muted-foreground">Recommended: review the sections above and try again. You can still continue.</span> : <span className="text-sm text-muted-foreground">Good work. Use the topic quiz for more practice.</span>}
            </div>
            <button type="button" onClick={retryKnowledgeCheck} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold hover:bg-muted" data-testid="button-retry-knowledge-check"><RotateCcw size={14} /> Try these questions again</button>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{Object.keys(answers).length} of {lesson.quickCheck.length} answered</span>
            <button type="button" onClick={submitKnowledgeCheck} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-submit-knowledge-check">Submit knowledge check <ArrowUpRight size={15} /></button>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><BookOpen size={18} /></span><div><h2 className="font-display text-lg font-extrabold">References for further reading</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Use these sources to deepen or verify the topic. A reference link supports study but does not automatically verify every quiz item.</p></div></div>
        <div className="mt-4 space-y-2">
          {lesson.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"><ExternalLink size={15} className="mt-1 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{source.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{source.publisher}</span><span className="mt-1 block break-all text-[10px] text-muted-foreground">{source.url}</span></span></a>)}
        </div>
      </section>

      <div className="mt-6 flex flex-col justify-between gap-3 sm:flex-row">
        {previous ? <Link href={`/subjects/${lesson.subjectId}/lessons/${previous.id}`} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"><ArrowLeft size={16} /><span><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Previous lesson</span><span>{previous.title}</span></span></Link> : <span />}
        {next ? <Link href={`/subjects/${lesson.subjectId}/lessons/${next.id}`} className="inline-flex items-center justify-end gap-2 rounded-xl border border-border px-4 py-3 text-right text-sm font-semibold hover:bg-muted"><span><span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Next lesson</span><span>{next.title}</span></span><ArrowRight size={16} /></Link> : <Link href={`/subjects/${lesson.subjectId}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Back to subject <ArrowRight size={16} /></Link>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link href={`/quiz/setup?subject=${lesson.subjectId}&topic=${lesson.id}`} className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"><BookOpenCheck size={15} /> Open the full topic quiz <ArrowUpRight size={14} /></Link>
        {curriculumItem && <span className="text-xs text-muted-foreground">Curriculum position {curriculumItem.order}</span>}
      </div>
    </div>
  );
}
