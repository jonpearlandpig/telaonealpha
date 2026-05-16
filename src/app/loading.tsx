export default function Loading() {
  return <div className='min-h-screen bg-[var(--bg)] text-[var(--text-primary)]'>
    <div className='mx-auto max-w-[460px] px-6 py-10 space-y-4'>
      <div className='h-6 w-40 rounded bg-white/40 animate-pulse' />
      <div className='h-24 rounded-[28px] bg-white/50 animate-pulse' />
      <div className='h-24 rounded-[28px] bg-white/50 animate-pulse' />
      <div className='h-24 rounded-[28px] bg-white/50 animate-pulse' />
    </div>
  </div>
}
