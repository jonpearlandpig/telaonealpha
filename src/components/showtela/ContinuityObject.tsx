import { OperationalImage } from './OperationalImage';
import type { ContinuityEntity } from './types';

export function ContinuityObject({ entity }: { entity: ContinuityEntity }) {
  return (
    <article className="w-[76px] shrink-0 snap-start text-center">
      <button className="relative h-[72px] w-[72px] rounded-full border-[3px] border-[#C89B2F] p-[2px] shadow-[0_6px_18px_rgba(17,17,17,0.04)] transition-transform active:scale-[0.96]">
        <OperationalImage src={entity.image} alt={entity.name} className="h-full w-full rounded-full object-cover" />
        <span className="absolute -right-1 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-[#C89B2F] px-1 text-[10px] font-semibold text-white">
          {entity.unresolvedCount}
        </span>
      </button>
      <p className="mt-1 text-[12px] font-medium leading-4 text-[#111111]">{entity.name}</p>
      <p className="text-[10px] leading-3 text-[#9A948B]">{entity.latest}</p>
    </article>
  );
}
