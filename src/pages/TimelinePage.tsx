import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import MealCard from '../components/MealCard'
import { supabase } from '../lib/supabase'
import type { Meal } from '../types'

const baseSelect = '*, profiles(display_name, avatar_path), comments(*, profiles(display_name, avatar_path))'

export default function TimelinePage({ userId }: { userId: string }) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [votingAvailable, setVotingAvailable] = useState(true)

  async function load() {
    setLoading(true)

    const withVotes = await supabase
      .from('meals')
      .select(`${baseSelect}, wasteful_votes(user_id)`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!withVotes.error) {
      setMeals((withVotes.data ?? []) as Meal[])
      setVotingAvailable(true)
      setLoading(false)
      return
    }

    const fallback = await supabase
      .from('meals')
      .select(baseSelect)
      .order('created_at', { ascending: false })
      .limit(50)

    setMeals((fallback.data ?? []) as Meal[])
    setVotingAvailable(false)
    setLoading(false)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('food-recording-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="page-shell">
      <header className="page-header">
        <div><p className="eyebrow">FRIENDS</p><h1>みんなの食事</h1><p>友達の無駄な外食を見逃さない。</p></div>
        <button className="icon-button" onClick={load} aria-label="更新"><RefreshCw size={20} className={loading ? 'spin' : ''} /></button>
      </header>

      {!votingAvailable && (
        <p className="form-message">投稿は表示中です。無駄な外食判定を使うにはSupabaseの追加SQLを1回実行してください。</p>
      )}

      <section className="feed">
        {meals.length
          ? meals.map((meal) => <MealCard key={meal.id} meal={meal} currentUserId={userId} onChanged={load} votingAvailable={votingAvailable} />)
          : <div className="empty-state"><span>👀</span><strong>投稿がまだありません</strong><p>最初の一食を記録してください。</p></div>}
      </section>
    </main>
  )
}
