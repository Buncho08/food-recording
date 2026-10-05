import { CalendarDays, UserRound, UsersRound } from 'lucide-react'

export type Tab = 'today' | 'timeline' | 'profile'

export default function BottomNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      <button className={tab === 'today' ? 'active' : ''} onClick={() => onChange('today')}><CalendarDays size={21} /><span>今日</span></button>
      <button className={tab === 'timeline' ? 'active' : ''} onClick={() => onChange('timeline')}><UsersRound size={21} /><span>みんな</span></button>
      <button className={tab === 'profile' ? 'active' : ''} onClick={() => onChange('profile')}><UserRound size={21} /><span>自分</span></button>
    </nav>
  )
}
