const PHRASES = [
  "explained in plain english",
  "overload predicted before it happens",
  "chain queues into workflows",
  "ai actions need your approval",
  "create a queue",
  "post jobs over rest",
  "workers process",
  "transient failures retry themselves",
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex shrink-0 items-center">
      {PHRASES.map((phrase) => (
        <span key={phrase} className="flex items-center whitespace-nowrap font-mono text-xs uppercase tracking-widest text-(--l-muted)">
          <span className="px-6">{phrase}</span>
          <span className="text-[11px] text-(--l-accent) [text-shadow:0_0_8px_var(--l-accent)]">◆</span>
        </span>
      ))}
    </div>
  );
}

export function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-(--l-border) py-4">
      <style>{`
        @keyframes relay-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .relay-marquee-track { animation: relay-marquee 45s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .relay-marquee-track { animation: none; } }
      `}</style>
      <div className="relay-marquee-track flex w-max">
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}

export default Marquee;
