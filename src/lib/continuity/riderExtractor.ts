const CANONICAL_DEPARTMENTS = [
  'Sound', 'Lighting', 'Video', 'Stage', 'Rigging',
  'Catering', 'Security', 'Travel', 'Backline',
  'Wardrobe', 'Production', 'Advance', 'Trucking',
  'Tour Management', 'Merchandise', 'Press', 'Local Crew',
]

// Each entry: [canonical name, detection pattern]
const DEPARTMENT_PATTERNS: Array<[string, RegExp]> = [
  ['Sound', /\b(sound|audio|PA system|FOH|front[\s-]of[\s-]house|monitor engineer)\b/i],
  ['Lighting', /\b(lighting|lights|LD|lighting designer|lighting rig)\b/i],
  ['Video', /\b(video|LED wall|LED screen|video director|screens)\b/i],
  ['Stage', /\b(stage|stage manager|stage hand)\b/i],
  ['Rigging', /\b(rigging|rigger|fly system)\b/i],
  ['Catering', /\b(catering|craft services|hospitality rider|dressing room)\b/i],
  ['Security', /\b(security|crowd control)\b/i],
  ['Travel', /\b(travel|transportation|bus|driver|routing)\b/i],
  ['Backline', /\b(backline|backline technician|guitar tech|drum tech)\b/i],
  ['Wardrobe', /\b(wardrobe|wardrobe stylist|costume)\b/i],
  ['Production', /\b(production manager|production office|production coordinator)\b/i],
  ['Advance', /\b(advance|advance team|advance person)\b/i],
  ['Trucking', /\b(trucking|freight|cargo|trailer)\b/i],
  ['Tour Management', /\b(tour manager|tour management)\b/i],
  ['Merchandise', /\b(merchandise|merch|merch manager)\b/i],
  ['Press', /\b(press|media|publicist|photographer)\b/i],
  ['Local Crew', /\b(local crew|locals|day crew|stagehands)\b/i],
]

export function extractDepartmentsFromRider(content: string): string[] {
  const found: string[] = []
  for (const [canonical, pattern] of DEPARTMENT_PATTERNS) {
    if (pattern.test(content)) found.push(canonical)
  }
  return found
}
