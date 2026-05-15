export function AddUpdateSheet({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  if (!open) return null
  return <div className='fixed inset-0 z-50 bg-black/20' onClick={onClose}><div onClick={(e)=>e.stopPropagation()} className='absolute bottom-0 left-0 right-0 mx-auto max-w-[460px] rounded-t-[32px] bg-white p-6 space-y-3'>
    <h2 className='text-xl'>Add Update</h2><textarea className='w-full min-h-24 rounded-2xl border border-[var(--border)] p-3' placeholder='Capture operational continuity…' />
    <div className='grid grid-cols-2 gap-2 text-sm'>{['Voice Note','Image Upload','Department','Urgency','Owner'].map((f)=><button key={f} className='min-h-11 rounded-xl border border-[var(--border)]'>{f}</button>)}</div>
    <button className='w-full min-h-11 rounded-full bg-[var(--text-primary)] text-white'>Post Update</button>
  </div></div>
}
