export type DocumentClass = 'anchor-directory' | 'tour-calendar' | 'production-rider' | 'generic'

const ANCHOR_NAME = [/anchor[\s_-]?dir/i, /contact[\s_-]?list/i, /crew[\s_-]?list/i, /staff[\s_-]?list/i, /personnel/i, /address[\s_-]?book/i, /\bdirectory\b/i]
const CALENDAR_NAME = [/tour[\s_-]?cal/i, /show[\s_-]?schedule/i, /itinerary/i, /routing/i, /\bschedule\b/i, /\bdates\b/i]
const RIDER_NAME = [/\brider\b/i, /production[\s_-]?spec/i, /tech[\s_-]?spec/i, /\btechnical\b/i, /hospitality/i, /advance[\s_-]?sheet/i]

const ANCHOR_CONTENT = [/\bphone\b.*\d{3}/i, /\bemail\b.*@/i, /\bcell\b.*\d{3}/i, /^\s*[A-Z][a-z]+ [A-Z][a-z]+\s*[|,\t]/m]
const CALENDAR_CONTENT = [/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}/i, /\bvenue\b/i, /\bshowtime\b/i, /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/]
const RIDER_CONTENT = [/\bSound System\b/i, /\bPA System\b/i, /\bLighting\s*Rig\b/i, /\bBackline\b/i, /\bHospitality\s+Rider\b/i, /\bProduction\s+Manager\b/i, /\bMonitor\s+Engineer\b/i]

export function classifyDocument(filename: string, content: string): DocumentClass {
  const name = filename.toLowerCase()

  if (ANCHOR_NAME.some(s => s.test(name))) return 'anchor-directory'
  if (CALENDAR_NAME.some(s => s.test(name))) return 'tour-calendar'
  if (RIDER_NAME.some(s => s.test(name))) return 'production-rider'

  const scores = {
    anchor: ANCHOR_CONTENT.filter(s => s.test(content)).length,
    calendar: CALENDAR_CONTENT.filter(s => s.test(content)).length,
    rider: RIDER_CONTENT.filter(s => s.test(content)).length,
  }

  const max = Math.max(scores.anchor, scores.calendar, scores.rider)
  if (max === 0) return 'generic'
  if (scores.anchor === max) return 'anchor-directory'
  if (scores.calendar === max) return 'tour-calendar'
  return 'production-rider'
}
