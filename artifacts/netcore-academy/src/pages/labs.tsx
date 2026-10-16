import { useState } from 'react';
import { Activity, ArrowDown, Check, Clock3, Cpu, Network, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { PageHeading } from '@/components/shell';
import { CableLab, DiagnosticsLab, MemoryLab, PermissionsLab, SubnettingLab } from '@/components/lab-panels';

type Packet = { hop: number; address: string; delay: number; label: string };
const sampleHops: Packet[] = [
  { hop: 1, address: '192.168.1.1', delay: 1.3, label: 'Local gateway' },
  { hop: 2, address: '10.34.0.1', delay: 6.8, label: 'Private network' },
  { hop: 3, address: '203.0.113.18', delay: 18.4, label: 'Transit router' },
  { hop: 4, address: '198.51.100.42', delay: 24.7, label: 'Destination edge' },
];
const processes = [
  { name: 'Indexer', burst: 5, color: 'bg-primary' },
  { name: 'Browser', burst: 3, color: 'bg-accent' },
  { name: 'Backup', burst: 4, color: 'bg-[#6688a0]' },
];

export default function LabsPage() {
  const [active, setActive] = useState<'route' | 'scheduler' | 'diagnostics' | 'subnet' | 'cable' | 'memory' | 'permissions'>('route');
  const [target, setTarget] = useState('learn.netcore.local');
  const [trace, setTrace] = useState<Packet[] | null>(null);
  const [schedule, setSchedule] = useState(false);

  return (
    <div>
      <PageHeading eyebrow="Safe practice environment" title="Try the idea, not a real system." description="Small browser-only simulations make network and operating system concepts tangible. Nothing here sends traffic or runs commands." />
      <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><ShieldCheck size={18} /></span><p className="text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Contained by design.</span> Simulations use fixed sample data and local state only. No shell, external network, or live device access.</p></div></div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Choose a simulation">
        {[
          ['route', 'Route path'],
          ['diagnostics', 'Network diagnostics'],
          ['subnet', 'Subnetting'],
          ['cable', 'Cable faults'],
          ['scheduler', 'CPU scheduler'],
          ['memory', 'Memory map'],
          ['permissions', 'Linux permissions'],
        ].map(([id, label]) => <button key={id} type="button" onClick={() => setActive(id as typeof active)} role="tab" aria-selected={active === id} className={`rounded-xl px-4 py-2.5 text-xs font-bold ${active === id ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground'}`} data-testid={`tab-${id}-lab`}>{label}</button>)}
      </div>
      {active === 'route' ? <section className="overflow-hidden rounded-[24px] border border-border bg-card">
        <div className="border-b border-border p-5 sm:p-7"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Network size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Follow a packet</h2><p className="mt-1 text-xs text-muted-foreground">A deterministic four-hop route-path illustration.</p></div></div>
          <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); setTrace(sampleHops); }}><label htmlFor="lab-target" className="sr-only">Simulation label</label><input id="lab-target" value={target} onChange={e => setTarget(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm" data-testid="input-lab-target" /><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-run-route"><Play size={15} /> Simulate route</button></form>
        </div>
        <div className="p-5 sm:p-7">
          {trace ? <div className="animate-in"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-primary">Simulation complete</p><p className="mt-1 text-sm font-semibold">Path to <span className="mono">{target || 'unnamed target'}</span></p></div><button type="button" onClick={() => setTrace(null)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted" data-testid="button-reset-route"><RotateCcw size={13} /> Reset</button></div>
            <div className="space-y-2">{trace.map((hop, i) => <div key={hop.hop} className="flex items-center gap-3 rounded-xl bg-secondary/55 p-3 sm:p-4" data-testid={`route-hop-${hop.hop}`}><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background font-mono text-xs font-bold">{String(hop.hop).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="mono truncate text-xs font-semibold">{hop.address}</p><p className="mt-1 text-[10px] text-muted-foreground">{hop.label}</p></div><span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><Clock3 size={12} />{hop.delay.toFixed(1)} ms</span>{i < trace.length - 1 && <span className="hidden text-muted-foreground sm:inline"><ArrowDown size={14} /></span>}</div>)}</div>
          </div> : <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-border"><div className="text-center"><span className="mx-auto grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground"><Activity size={18} /></span><p className="mt-3 text-xs font-semibold">Route visualization is ready</p><p className="mt-1 text-[10px] text-muted-foreground">Enter any label, then run the local simulation.</p></div></div>}
        </div>
      </section> : active === 'scheduler' ? <section className="rounded-[24px] border border-border bg-card p-5 sm:p-7">
        <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-accent/20 text-foreground"><Cpu size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Round-robin scheduler</h2><p className="mt-1 text-xs text-muted-foreground">See how a fixed quantum shares CPU time across waiting processes.</p></div></div>
        <div className="mt-6 rounded-xl bg-secondary/50 p-4"><div className="flex items-center justify-between"><p className="text-xs font-bold">Ready queue</p><span className="font-mono text-[10px] text-muted-foreground">quantum = 2 units</span></div><div className="mt-4 space-y-3">{processes.map((process, index) => <div key={process.name} className="flex items-center gap-3"><span className="w-16 text-xs font-semibold">{process.name}</span><div className="flex flex-1 gap-1.5">{Array.from({ length: process.burst }, (_, unit) => <div key={unit} className={`h-7 flex-1 rounded-md ${schedule ? unit < 2 ? process.color : 'bg-muted' : 'bg-muted'}`} />)}</div><span className="w-14 text-right font-mono text-[10px] text-muted-foreground">{process.burst} units</span>{schedule && index < 2 && <ArrowDown size={13} className="text-primary" />}</div>)}</div></div>
        {schedule && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="flex items-center gap-2 text-xs font-bold text-primary"><Check size={15} /> One pass completed</p><p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Each ready process received up to two CPU units in turn. Processes with remaining work return to the queue for another pass.</p></div>}
        <button type="button" onClick={() => setSchedule(value => !value)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-run-scheduler">{schedule ? <><RotateCcw size={15} /> Reset queue</> : <><Play size={15} /> Run one pass</>}</button>
      </section> : active === 'diagnostics' ? <DiagnosticsLab />
        : active === 'subnet' ? <SubnettingLab />
        : active === 'cable' ? <CableLab />
        : active === 'memory' ? <MemoryLab />
        : <PermissionsLab />}
      <section className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">What to notice</p><p className="mt-2 text-sm font-semibold">Networks move in hops.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Each router forwards traffic toward a destination; the sample delay grows along the route.</p></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Next concept</p><p className="mt-2 text-sm font-semibold">Schedulers trade turns.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">A time slice gives each ready process a turn without letting one task hold the CPU indefinitely.</p></div></section>
    </div>
  );
}
