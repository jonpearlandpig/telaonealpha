export function BottomNav({ onAdd }: { onAdd: ()=>void }) {
  return <nav className='fixed bottom-0 left-0 right-0 mx-auto max-w-[460px] h-[88px] bg-white/90 backdrop-blur border-t border-[var(--border)] shadow-[var(--shadow-floating)] px-5 pb-6 pt-3'>
    <div className='grid grid-cols-5 text-xs items-center text-center'>
      <button>Ops Feed</button><button>Search</button><button onClick={onAdd} className='h-11 w-11 mx-auto rounded-full bg-[var(--gold)] text-white'>＋</button><button>Live</button><button>My Ops</button>
    </div>
  </nav>
}
