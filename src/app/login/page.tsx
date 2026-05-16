type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>
}

const ERROR_COPY: Record<string, string> = {
  unauthorized: 'This email is not on the private allowlist.',
  malformed: 'Login request was malformed. Please try again.',
  missing_email: 'Please enter your email before continuing.',
  method: 'Please submit the form to sign in.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {}
  const error = params.error ? ERROR_COPY[params.error] ?? 'Unable to sign in. Please try again.' : null

  return (
    <main className='min-h-screen grid place-items-center bg-[var(--bg)] px-6'>
      <form method='post' action='/api/auth/login' className='w-full max-w-sm bg-white rounded-[28px] p-6 space-y-4 border border-[var(--border)] shadow-[var(--shadow-soft)]'>
        <h1 className='text-2xl'>ShowTELA Login</h1>
        <p className='text-sm text-[var(--text-secondary)]'>Private access for Jon, Juan, and Mags.</p>
        {error && <p className='text-sm text-[var(--gold)]'>{error}</p>}
        <input name='email' type='email' required placeholder='Email' className='w-full min-h-11 rounded-xl border border-[var(--border)] px-3' />
        <button type='submit' className='w-full min-h-11 rounded-full bg-[var(--text-primary)] text-white'>Continue</button>
      </form>
    </main>
  )
}
