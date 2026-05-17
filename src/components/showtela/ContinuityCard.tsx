import { FeedActionBar } from './FeedActionBar';
import { OperationalImage } from './OperationalImage';
import { StatusPill } from './StatusPill';
import type { FeedItem, VisualPreset } from './types';

function toTimestamp(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const time = date
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' AM', 'A')
    .replace(' PM', 'P');
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = String(date.getFullYear()).slice(-2);
  return `${weekday} ${time} ${month}/${day}/${year}`;
}

export function ContinuityCard({ item, visual }: { item: FeedItem; visual: VisualPreset }) {
  const unresolved = !item.status || item.status.toLowerCase() !== 'resolved';

  return (
    <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_6px_18px_rgba(17,17,17,0.04)]">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <OperationalImage src={visual.image} alt="operator" className="mt-0.5 h-8 w-8 rounded-full object-cover" />
          <div>
            <p className="text-[14px] font-semibold leading-4">{item.owner || 'Ops Lead'}</p>
            <p className="mt-0.5 text-[12px] leading-4 text-[#6E6A63]">
              <span className="text-[#7A63C7]">{visual.category}</span> · {toTimestamp(item.updated)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill unresolved={unresolved} />
          <button className="text-[#9A948B]">•••</button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[1fr_124px] gap-3">
        <div>
          <p className="mb-1 text-[13px] text-[#4B84C6]">{item.priority || 'Operational'}</p>
          <h2 className="text-[17px] font-semibold leading-[22px] tracking-[-0.4px]">{visual.realisticTitle}</h2>
          <p className="mt-1 line-clamp-2 text-[15px] leading-[24px] text-[#6E6A63]">{visual.realisticSummary}</p>
        </div>
        <OperationalImage src={visual.image} alt={visual.category} className="h-[124px] w-[124px] rounded-[18px] object-cover contrast-110" />
      </div>

      <FeedActionBar />
    </article>
  );
}
