import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, Bookmark, ChevronRight, Command, FlaskConical, LayoutDashboard, Moon, Sun, Wifi } from 'lucide-react';
import { getHealthCheckQueryKey, useHealthCheck } from '@workspace/api-client-react';

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/subjects/network-fundamentals', label: 'Subjects', icon: BookOpen },
  { href: '/review', label: 'Review desk', icon: Bookmark },
  { href: '/labs', label: 'Practice labs', icon: FlaskConical },
];

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [dark, setDark] = useState(() => localStorage.getItem('netcore-theme') === 'dark');
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 60000 } });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('netcore-theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground" dir="auto">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-border bg-[hsl(var(--sidebar))] px-5 py-6 md:flex md:flex-col">
        <Link href="/" className="mb-10 flex items-center gap-3 px-2" data-testid="link-brand">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground"><Wifi size={21} strokeWidth={2.2} /></span>
          <span>
            <span className="block font-display text-[17px] font-extrabold tracking-tight">NetCore</span>
            <span className="block text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">Academy</span>
          </span>
        </Link>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.19em] text-muted-foreground">Your workspace</p>
        <nav className="space-y-1" aria-label="Main navigation">
          {navItems.map(({ href, label, icon: Icon }) => {
            const selected = href === '/' ? location === '/' : location.startsWith(href) || (href.includes('network-fundamentals') && location.startsWith('/subjects'));
            return (
              <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-colors ${selected ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                {selected && <span className="size-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-border bg-background/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-primary"><Command size={15} /><span className="text-[11px] font-bold uppercase tracking-wider">Study rhythm</span></div>
          <p className="text-xs leading-relaxed text-muted-foreground">Small, steady practice builds reliable understanding.</p>
          <Link href="/quiz/setup" className="mt-4 flex items-center justify-between text-xs font-bold text-foreground" data-testid="link-sidebar-quick-practice">Start a session <ChevronRight size={15} /></Link>
        </div>
        <div className="mt-5 flex items-center gap-3 px-2">
          <span className="grid size-8 place-items-center rounded-full bg-accent/25 text-xs font-bold text-foreground">G</span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">Guest learner</span><span className="block text-[10px] text-muted-foreground">Progress saved on this device</span></span>
        </div>
      </aside>
      <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md md:ml-[250px] md:px-8">
        <Link href="/" className="flex items-center gap-2 md:hidden" data-testid="link-mobile-brand">
          <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground"><Wifi size={17} /></span>
          <span className="font-display text-sm font-extrabold">NetCore</span>
        </Link>
        <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex"><span>Learning space</span><span>/</span><span className="font-semibold text-foreground">{navItems.find(x => (x.href === '/' ? location === '/' : location.startsWith(x.href)))?.label || 'Study session'}</span></div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[10px] font-medium text-muted-foreground sm:flex" data-testid="status-api-health"><span className={`size-1.5 rounded-full ${health.isError ? 'bg-destructive' : health.isSuccess ? 'bg-primary' : 'bg-accent'}`} />{health.isError ? 'Offline' : health.isSuccess ? 'Connected' : 'Connecting'}</span>
          <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">Guest mode</span>
          <button type="button" onClick={() => setDark(v => !v)} className="grid size-9 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} data-testid="button-toggle-theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        </div>
      </header>
      <main className="min-h-[calc(100dvh-66px)] md:ml-[250px]">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-7 pb-24 sm:px-7 lg:px-10 lg:py-10">{children}</div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 px-2 py-2 backdrop-blur-md md:hidden" aria-label="Mobile navigation">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-semibold ${location.startsWith(href) && (href !== '/' || location === '/') ? 'text-primary' : 'text-muted-foreground'}`} data-testid={`mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={18} /><span>{label}</span></Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div className="animate-in">
        {eyebrow && <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-extrabold tracking-[-.04em] sm:text-[38px]" data-testid="text-page-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function LoadingState() {
  return <div className="space-y-4" aria-label="Loading content"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="grid gap-4 sm:grid-cols-2"><div className="h-40 animate-pulse rounded-2xl bg-muted" /><div className="h-40 animate-pulse rounded-2xl bg-muted" /></div></div>;
}

export function ErrorState({ retry, message = 'We could not load this right now.' }: { retry: () => void; message?: string }) {
  return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6" role="alert"><p className="font-semibold">{message}</p><button className="mt-3 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background" onClick={retry} data-testid="button-retry">Try again</button></div>;
}
