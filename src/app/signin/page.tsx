import { signIn } from '@/auth'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F6F2] px-6">
      <div className="w-full max-w-[340px]">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#C89B2F]/60 bg-[#141210] shadow-[0_0_0_6px_rgba(200,155,47,0.10)]">
            <span className="text-[16px] font-semibold tracking-tight text-[#D8A742]">ST</span>
          </div>
          <div className="text-center">
            <p className="text-[16px] font-semibold tracking-tight text-[#141210]">SHOWTELA</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#C89B2F]">Crusade: The Musical</p>
          </div>
        </div>

        {/* Sign in card */}
        <div className="rounded-[24px] border border-[#EAE4DA] bg-white px-6 py-8 shadow-[0_8px_32px_rgba(17,17,17,0.08)]">
          <h1 className="text-[20px] font-semibold text-[#141210]">Sign in</h1>
          <p className="mt-1 text-[13px] text-[#8B847B]">Operational continuity, live.</p>

          <form
            className="mt-6"
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/showtela' })
            }}
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-[#EAE4DA] bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-[14px] font-medium text-[#141210]">Continue with Google</span>
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#B8A88A]">
          CONFIDENTIAL · PEARL & PIG · POWERED BY SHOWTELA
        </p>
      </div>
    </main>
  )
}
