import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import MealCard from '../components/MealCard'
import { hydrateMeals } from '../lib/mealFeed'
import { supabase } from '../lib/supabase'
import type { Meal } from '../types'

export default function TimelinePage({ userId }: { userId: string }) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [votingAvailable, setVotingAvailable] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    const mealResult = await supabase
      .from('meals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (mealResult.error) {
      setMeals([])
      setError(`食事の取得に失敗しました: ${mealResult.error.message}`)
      setLoading(false)
      return
    }

    const hydrated = await hydrateMeals((mealResult.data ?? []) as Meal[])
    setMeals(hydrated.meals)
    setVotingAvailable(hydrated.votingAvailable)
    setError(hydrated.voteError)
    setLoading(false)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('food-recording-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wasteful_votes' }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="page-shell">
      <header className="page-header">
        <div><p className="eyebrow">FRIENDS</p><h1>みんなの食事</h1><p>友達の無駄な外食を見逃さない。</p></div>
        <button className="icon-button" onClick={load} aria-label="更新"><RefreshCw size={20} className={loading ? 'spin' : ''} /></button>
      </header>

      {error && <p className="form-message error">{error}</p>}

      <section className="feed">
        {meals.length
          ? meals.map((meal) => <MealCard key={meal.id} meal={meal} currentUserId={userId} onChanged={load} votingAvailable={votingAvailable} />)
          : <div className="empty-state"><span>👀</span><strong>投稿がまだありません</strong><p>最初の一食を記録してください。</p></div>}
      </section>
    </main>
  )
}
