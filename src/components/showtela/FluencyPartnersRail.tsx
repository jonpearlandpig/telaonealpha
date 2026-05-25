type FluencyItem = {
  id: string
  name?: string
  label?: string
  unresolvedCount?: number
  image?: string
  latest?: string
}

type Props = {
  items?: FluencyItem[]
  onPersonTap?: (name: string, role?: string) => void
}

export function FluencyPartnersRail(_: Props) {
  return null
}
