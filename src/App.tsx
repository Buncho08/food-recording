import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import AuthGate from './components/AuthGate'
import BottomNav, { type Tab } from './components/BottomNav'
import { supabase } from './lib/supabase'
import TodayPage from './pages/TodayPage'
import TimelinePage from './pages/TimelinePage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  return (
    <AuthGate signedIn={!!session} loading={loading}>
      <div className="app-frame">
        {userId && tab === 'today' && <TodayPage userId={userId} />}
        {userId && tab === 'timeline' && <TimelinePage userId={userId} />}
        {userId && tab === 'profile' && <ProfilePage userId={userId} />}
        <BottomNav tab={tab} onChange={setTab} />
      </div>
    </AuthGate>
  )
}
