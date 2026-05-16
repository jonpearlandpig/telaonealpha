export default function LoginPage() {
  return (
    <main className='min-h-screen grid place-items-center bg-[var(--bg)] px-6'>
      <form method='POST' action='/api/auth/login' className='w-full max-w-sm bg-white rounded-[28px] p-6 space-y-4 border border-[var(--border)] shadow-[var(--shadow-soft)]'>
        <h1 className='text-2xl'>ShowTELA Login</h1>
        <p className='text-sm text-[var(--text-secondary)]'>Private access for Jon, Juan, and Mags.</p>
        <input name='email' type='email' required placeholder='Email' className='w-full min-h-11 rounded-xl border border-[var(--border)] px-3' />
        <button className='w-full min-h-11 rounded-full bg-[var(--text-primary)] text-white'>Continue</button>
      </form>
    </main>
  )
}
