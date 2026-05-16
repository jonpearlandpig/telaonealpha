'use client'

export function BottomNav({ onAdd, active, onTab }: { onAdd: ()=>void; active: string; onTab: (tab: string)=>void }) {
  const tabs = ['Home', 'Ops', 'Updates', 'Search', 'Profile']
  return <nav className='fixed bottom-0 left-0 right-0 mx-auto max-w-[460px] h-[92px] bg-white/90 backdrop-blur border-t border-[var(--border)] shadow-[var(--shadow-floating)] px-5 pb-7 pt-3'>
    <div className='grid grid-cols-5 text-xs items-center text-center'>
      {tabs.map((tab, idx) => idx === 2 ? <button key={tab} onClick={onAdd} className='h-11 w-11 mx-auto rounded-full bg-[var(--gold)] text-white'>＋</button> : <button key={tab} onClick={() => onTab(tab)} className={active===tab ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}>{tab}</button>)}
    </div>
  </nav>
}
