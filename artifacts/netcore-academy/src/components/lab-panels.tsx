import { useState } from 'react';
import { Activity, Cable, Calculator, Cpu, FileText, Network, Terminal } from 'lucide-react';

const commandSamples = {
  ipconfig: {
    label: 'ipconfig',
    output: 'IPv4 Address . . . . . . . . . . : 169.254.24.18\nSubnet Mask . . . . . . . . . . . : 255.255.0.0\nDefault Gateway . . . . . . . . . :',
    interpretation: 'The host has a link-local address and no default gateway. Check the local link and DHCP service or relay path first.',
  },
  ip: {
    label: 'ip addr / ip route',
    output: 'inet 192.168.10.24/24 dev enp0s3\n default via 192.168.10.1 dev enp0s3',
    interpretation: 'The interface has an IPv4 address and a default route. Next, test the gateway, then an IP beyond the LAN, then DNS.',
  },
  ping: {
    label: 'ping 192.168.1.1',
    output: 'From 192.168.1.20 icmp_seq=1 Destination Host Unreachable\nFrom 192.168.1.20 icmp_seq=2 Destination Host Unreachable',
    interpretation: 'The gateway is not reachable from this host. Check link state, the local address and mask, VLAN membership, and the gateway interface.',
  },
  traceroute: {
    label: 'traceroute example.net',
    output: '1  192.168.1.1     1.8 ms\n2  10.20.0.1       8.4 ms\n3  * * *',
    interpretation: 'The first two hops replied; the next hop did not reply to these probes. Some routers filter or deprioritize traceroute traffic, so a timeout alone does not prove the path is down.',
  },
  nslookup: {
    label: 'nslookup example.net',
    output: 'Server: 192.168.10.1\nAddress: 192.168.10.1#53\n** server can’t find example.net: SERVFAIL',
    interpretation: 'A resolver responded but could not complete this name lookup. Compare with a ping to a known IP address to separate DNS trouble from basic IP reachability.',
  },
} as const;

export function DiagnosticsLab() {
  const [command, setCommand] = useState<keyof typeof commandSamples>('ipconfig');
  const [ran, setRan] = useState(false);
  const sample = commandSamples[command];
  return (
    <section className="rounded-[24px] border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Terminal size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Diagnose a connection</h2><p className="mt-1 text-xs text-muted-foreground">Inspect fixed command output from an isolated sample device.</p></div></div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="min-w-0 flex-1 text-xs font-semibold">Sample command<select value={command} onChange={event => { setCommand(event.target.value as keyof typeof commandSamples); setRan(false); }} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm" data-testid="select-diagnostic-command">{Object.entries(commandSamples).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label><button type="button" onClick={() => setRan(true)} className="self-end rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-run-diagnostic">Interpret sample</button></div>
      <div className="mt-5 rounded-xl bg-[#17232d] p-4 text-[#e0ece8]" aria-live="polite"><p className="mb-2 font-mono text-[10px] text-[#8ba9a6]">$ {sample.label}</p><pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed">{sample.output}</pre></div>
      {ran && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4" role="status"><p className="flex items-center gap-2 text-xs font-bold text-primary"><Activity size={14} /> What this suggests</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{sample.interpretation}</p></div>}
      <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">The command is displayed for learning; it is not executed on this server or on your device.</p>
    </section>
  );
}

function parseIPv4(value: string): number | null {
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(part => /^\d{1,3}$/.test(part) ? Number(part) : -1);
  if (octets.some(octet => octet < 0 || octet > 255)) return null;
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]);
}

function formatIPv4(value: number): string {
  const octets = [
    Math.floor(value / 16777216) % 256,
    Math.floor(value / 65536) % 256,
    Math.floor(value / 256) % 256,
    value % 256,
  ];
  return octets.join('.');
}

export function SubnettingLab() {
  const [address, setAddress] = useState('192.168.1.130');
  const [prefix, setPrefix] = useState('26');
  const [result, setResult] = useState<{
    network: string;
    broadcast: string;
    mask: string;
    hostBits: number;
    total: number;
    usable: number;
  } | null>(null);
  const [error, setError] = useState('');
  const calculate = () => {
    const ip = parseIPv4(address);
    const prefixLength = Number(prefix);
    if (ip === null || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
      setError('Enter a valid IPv4 address and a prefix from 0 to 32.');
      setResult(null);
      return;
    }
    const hostBits = 32 - prefixLength;
    const total = 2 ** hostBits;
    const network = Math.floor(ip / total) * total;
    const broadcast = network + total - 1;
    const usable = prefixLength <= 30 ? Math.max(0, total - 2) : prefixLength === 31 ? 2 : 1;
    setError('');
    setResult({
      network: formatIPv4(network),
      broadcast: formatIPv4(broadcast),
      mask: formatIPv4(4294967296 - total),
      hostBits,
      total,
      usable,
    });
  };
  return (
    <section className="rounded-[24px] border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Calculator size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Subnetting workbench</h2><p className="mt-1 text-xs text-muted-foreground">Calculate a network range locally, then follow the steps.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
        <label className="text-xs font-semibold">IPv4 address<input value={address} onChange={event => setAddress(event.target.value)} inputMode="decimal" className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 font-mono text-sm" data-testid="input-subnet-ip" /></label>
        <label className="text-xs font-semibold">Prefix length<input type="number" min="0" max="32" value={prefix} onChange={event => setPrefix(event.target.value)} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 font-mono text-sm" data-testid="input-subnet-prefix" /></label>
        <button type="button" onClick={calculate} className="self-end rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground" data-testid="button-calculate-subnet">Calculate</button>
      </div>
      {error && <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>}
      {result && <div className="mt-5 animate-in" aria-live="polite">
        <div className="grid gap-3 sm:grid-cols-3">
          {[['Network', result.network], ['Broadcast', result.broadcast], ['Subnet mask', result.mask]].map(([label, value]) => <div key={label} className="rounded-xl bg-secondary/60 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 font-mono text-sm font-semibold">{value}</p></div>)}
        </div>
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-xs font-bold text-primary">Step by step</p><ol className="mt-2 list-inside list-decimal space-y-1.5 text-xs leading-relaxed text-muted-foreground"><li>32 − {prefix} leaves {result.hostBits} host bits.</li><li>That creates {result.total.toLocaleString()} addresses in this block.</li><li>The address falls between network {result.network} and broadcast {result.broadcast}.</li><li>Usable host count under common IPv4 rules: {result.usable.toLocaleString()}.</li></ol><p className="mt-3 text-[10px] text-muted-foreground">For /31, both addresses are shown as usable for point-to-point links; /32 describes one address.</p></div>
      </div>}
    </section>
  );
}

const cableCases = [
  {
    title: 'Continuity passes, but the pair map reads 1–2, 3–4, 5–6, 7–8.',
    detail: 'The wire map still reports pin 1→1 through pin 8→8. Assume standard 10/100 Ethernet pair assignments.',
    options: ['Open conductor', 'Split pair', 'Correct straight-through cable'],
    correct: 'Split pair',
    explanation: 'Pins 3 and 6 should be the two conductors of one twisted pair; pins 4 and 5 should be paired together. A simple continuity map can pass while the cable still has split pairs.',
  },
  {
    title: 'A connector is being terminated to T568B.',
    detail: 'Which conductor belongs on pin 3 in the standard T568B color order?',
    options: ['White/green', 'White/orange', 'White/blue'],
    correct: 'White/green',
    explanation: 'T568B places white/orange on pin 1, orange on 2, white/green on 3, blue on 4, white/blue on 5, green on 6, white/brown on 7, and brown on 8.',
  },
  {
    title: 'The tester reports pin 5 as open at the far end.',
    detail: 'Other pins show the expected end-to-end mapping.',
    options: ['Open conductor or poor termination', 'DNS lookup failure', 'A router loop'],
    correct: 'Open conductor or poor termination',
    explanation: 'An open pin points to a physical continuity or termination problem. Inspect the conductor seating and connector crimp before changing network settings.',
  },
];

export function CableLab() {
  const [caseIndex, setCaseIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const current = cableCases[caseIndex];
  return (
    <section className="rounded-[24px] border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Cable size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Cable fault bench</h2><p className="mt-1 text-xs text-muted-foreground">Read simulated tester evidence; no physical equipment is connected.</p></div></div>
      <label className="mt-5 block text-xs font-semibold">Exercise<select value={caseIndex} onChange={event => { setCaseIndex(Number(event.target.value)); setSelected(''); }} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm">{cableCases.map((item, index) => <option key={item.title} value={index}>Exercise {index + 1}</option>)}</select></label>
      <div className="mt-4 rounded-xl bg-secondary/55 p-4"><p className="text-sm font-semibold">{current.title}</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{current.detail}</p></div>
      <fieldset className="mt-4 space-y-2"><legend className="mb-2 text-xs font-bold">What is the most likely finding?</legend>{current.options.map(option => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-xs hover:bg-secondary/50"><input type="radio" name="cable-finding" checked={selected === option} onChange={() => setSelected(option)} className="accent-[hsl(var(--primary))]" />{option}</label>)}</fieldset>
      {selected && <p className={`mt-4 rounded-xl p-4 text-xs leading-relaxed ${selected === current.correct ? 'bg-primary/5 text-foreground' : 'bg-accent/15 text-foreground'}`} role="status"><strong>{selected === current.correct ? 'Correct. ' : 'Review the evidence. '}</strong>{current.explanation}</p>}
    </section>
  );
}

const pageTable: Array<number | null> = [5, 2, null, 7];

export function MemoryLab() {
  const [page, setPage] = useState(0);
  const frame = pageTable[page];
  return (
    <section className="rounded-[24px] border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Cpu size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Virtual memory map</h2><p className="mt-1 text-xs text-muted-foreground">Translate a virtual page using a small sample page table.</p></div></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <label className="text-xs font-semibold">Choose a virtual page<select value={page} onChange={event => setPage(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 text-sm">{pageTable.map((value, index) => <option key={index} value={index}>Virtual page {index} → {value === null ? 'not present' : `frame ${value}`}</option>)}</select><p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Each process uses virtual page numbers. The page table records the current frame mapping and whether the page is present.</p></label>
        <div className="rounded-xl bg-secondary/55 p-4" aria-live="polite"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Translation result</p>{frame === null ? <><p className="mt-2 text-sm font-bold text-destructive">Page fault</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Virtual page {page} is not resident in the sample table. The OS must resolve the fault before the process can continue.</p></> : <><p className="mt-2 font-mono text-sm font-bold">Page {page} → frame {frame}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">The page is present. The page-table entry maps this virtual page to physical frame {frame}.</p></>}</div>
      </div>
    </section>
  );
}

function describePermission(bits: number): string {
  return `${bits & 4 ? 'r' : '-'}${bits & 2 ? 'w' : '-'}${bits & 1 ? 'x' : '-'}`;
}

export function PermissionsLab() {
  const [mode, setMode] = useState('644');
  const valid = /^\d{3}$/.test(mode) && [...mode].every(digit => Number(digit) <= 7);
  const groups = valid ? [...mode].map(Number) : [];
  return (
    <section className="rounded-[24px] border border-border bg-card p-5 sm:p-7">
      <div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><FileText size={19} /></span><div><h2 className="font-display text-lg font-extrabold">Linux permission reader</h2><p className="mt-1 text-xs text-muted-foreground">Interpret a numeric chmod mode without changing a real file.</p></div></div>
      <label className="mt-5 block max-w-xs text-xs font-semibold">Three-digit mode<input value={mode} onChange={event => setMode(event.target.value)} inputMode="numeric" maxLength={3} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-3 font-mono text-sm" aria-describedby="permission-help" data-testid="input-permission-mode" /></label>
      <p id="permission-help" className="mt-2 text-[10px] text-muted-foreground">Each digit adds read (4), write (2), and execute (1) permissions.</p>
      {!valid ? <p className="mt-3 text-xs text-destructive" role="alert">Enter exactly three octal digits from 0 to 7.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-live="polite">{groups.map((bits, index) => <div key={index} className="rounded-xl bg-secondary/55 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{['Owner', 'Group', 'Other'][index]} · {bits}</p><p className="mt-2 font-mono text-lg font-bold">{describePermission(bits)}</p></div>)}</div>}
      {valid && <p className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs leading-relaxed text-muted-foreground">For mode {mode}, the owner has {describePermission(groups[0])}, the group has {describePermission(groups[1])}, and others have {describePermission(groups[2])}.</p>}
    </section>
  );
}
