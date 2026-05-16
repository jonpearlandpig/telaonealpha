import { HomeScreenClient } from '@/components/home/HomeScreenClient'
import { fetchShowTelaFeed } from '@/lib/notion/showtela'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export default async function HomePage() {
  const feed = await fetchShowTelaFeed()
  return <HomeScreenClient initialCards={feed.cards} initialOps={feed.opsRail} />
}
