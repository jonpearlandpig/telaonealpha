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
    <main className='min-h-screen bg-[#F7F4EF] pb-32 text-[#111111]'>
      <ShowTelaHeader />
      <ActiveOpsRail items={vm.activeOps} />
      <FluencyPartnersRail items={vm.fluencyPartners} />
      <CrusadeOperationsRail items={vm.crusadeOperations} />
      <UnresolvedPressureCard pressure={vm.unresolvedPressure} />
      <ContinuityFeed items={vm.feed} onCardAction={onCardAction} />
      <BottomDock onPearlDrop={onPearlDrop} />
    </main>
  );
}
