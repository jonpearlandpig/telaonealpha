export type FeedListener = () => void

export function subscribeToContinuity(listener: FeedListener) {
  const timer = setInterval(() => listener(), 15000)
  return () => clearInterval(timer)
}
