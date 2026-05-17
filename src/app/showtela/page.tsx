import { ActiveOpsRail } from '@/components/showtela/ActiveOpsRail'
import { BottomNav } from '@/components/showtela/BottomNav'
import { ContinuityFeed } from '@/components/showtela/ContinuityFeed'
import { FluencyPartnersRail } from '@/components/showtela/FluencyPartnersRail'
import { OperationsRow } from '@/components/showtela/OperationsRow'
import { PressureCard } from '@/components/showtela/PressureCard'
import { RuntimeHeader } from '@/components/showtela/RuntimeHeader'
import { getShowTelaHome } from '@/lib/showtela/hydration'

export const dynamic = 'force-dynamic'

export default async function ShowTelaHome() {
  const data = await getShowTelaHome()

  return (
    <main className='mx-auto min-h-screen max-w-md bg-[#F7F4EF]'>
      <RuntimeHeader />
      <ActiveOpsRail people={data.activeOps} />
      <FluencyPartnersRail people={data.fluencyPartners} />
      <OperationsRow operations={data.operations} />
      <PressureCard total={data.pressureSummary.total} high={data.pressureSummary.high} medium={data.pressureSummary.medium} />
      <ContinuityFeed feed={data.continuityFeed} />
      <BottomNav />
    </main>
  )
}
