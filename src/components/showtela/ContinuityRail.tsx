import { ContinuityObject } from './ContinuityObject';
import type { ContinuityEntity } from './types';

export function ContinuityRail({ items }: { items: ContinuityEntity[] }) {
  return (
    <section className="px-4 pt-4">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((entity) => (
          <ContinuityObject key={entity.id} entity={entity} />
        ))}
      </div>
    </section>
  );
}
