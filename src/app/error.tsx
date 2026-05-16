'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className='min-h-screen grid place-items-center px-6 text-center'>
      <div className='space-y-4 max-w-sm'>
        <h2 className='text-2xl'>Live continuity feed unavailable</h2>
        <p className='text-sm text-[var(--text-secondary)]'>{error.message}</p>
        <button className='min-h-11 px-5 rounded-full border border-[var(--border)]' onClick={() => reset()}>
          Retry
        </button>
      </div>
    </div>
  )
}
