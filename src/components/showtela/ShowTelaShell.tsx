import { ActiveOpsRail } from './ActiveOpsRail';
import { BottomDock } from './BottomDock';
import { ContinuityFeed } from './ContinuityFeed';
import { CrusadeOperationsRail } from './CrusadeOperationsRail';
import { FluencyPartnersRail } from './FluencyPartnersRail';
import { ShowTelaHeader } from './ShowTelaHeader';
import { UnresolvedPressureCard } from './UnresolvedPressureCard';
import type { ShowTelaViewModel } from './types';
import type { ActionType } from './FeedActionBar';

export function ShowTelaShell({ vm, onCardAction, onPearlDrop }: { vm: ShowTelaViewModel; onCardAction: (itemId: string, action: ActionType) => void; onPearlDrop: () => void }) {
  return (
    <main className='relative mx-auto min-h-screen w-full max-w-[430px] bg-[#F7F4EF] pb-32 text-[#111111]'>
      <span className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(200,155,47,0.14),transparent_55%)]' />
      <ShowTelaHeader />
      <ActiveOpsRail people={vm.activeOps.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount, updatesCount: 0 }))} />
      <FluencyPartnersRail people={vm.fluencyPartners.map((i) => ({ id: i.id, name: i.name, role: i.latest, unresolvedCount: i.unresolvedCount }))} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      <ContinuityFeed feed={vm.feed.map((i) => ({ id: i.id, headline: i.title, body: i.summary, timestamp: i.timestamp, owner: { id: i.owner, name: i.owner } }))} />
      <BottomDock onPearlDrop={onPearlDrop} />
    </main>
  );
}
