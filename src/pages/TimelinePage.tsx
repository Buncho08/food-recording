import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import MealCard from '../components/MealCard'
import { supabase } from '../lib/supabase'
import type { Meal, WastefulVote } from '../types'

const baseSelect = '*, profiles(display_name, avatar_path), comments(*, profiles(display_name, avatar_path))'

function attachVotes(meals: Meal[], votes: WastefulVote[]) {
  return meals.map((meal) => ({
    ...meal,
    wasteful_votes: votes.filter((vote) => vote.meal_id === meal.id),
  }))
}

export default function TimelinePage({ userId }: { userId: string }) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)
  const [votingAvailable, setVotingAvailable] = useState(true)
  const [voteError, setVoteError] = useState('')

  async function load() {
    setLoading(true)
    setVoteError('')

    const mealResult = await supabase
      .from('meals')
      .select(baseSelect)
      .order('created_at', { ascending: false })
      .limit(50)

    if (mealResult.error) {
      setMeals([])
      setVoteError(`食事の取得に失敗しました: ${mealResult.error.message}`)
      setLoading(false)
      return
    }

    const baseMeals = (mealResult.data ?? []) as Meal[]

    if (baseMeals.length === 0) {
      setMeals([])
      setVotingAvailable(true)
      setLoading(false)
      return
    }

    const mealIds = baseMeals.map((meal) => meal.id)
    const voteResult = await supabase
      .from('wasteful_votes')
      .select('meal_id, user_id, created_at')
      .in('meal_id', mealIds)

    if (voteResult.error) {
      setMeals(baseMeals.map((meal) => ({ ...meal, wasteful_votes: [] })))
      setVotingAvailable(false)
      setVoteError(`判定機能エラー: ${voteResult.error.message}`)
    } else {
      setMeals(attachVotes(baseMeals, (voteResult.data ?? []) as WastefulVote[]))
      setVotingAvailable(true)
    }

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

      {voteError && <p className="form-message error">{voteError}</p>}

      <section className="feed">
        {meals.length
          ? meals.map((meal) => <MealCard key={meal.id} meal={meal} currentUserId={userId} onChanged={load} votingAvailable={votingAvailable} />)
          : <div className="empty-state"><span>👀</span><strong>投稿がまだありません</strong><p>最初の一食を記録してください。</p></div>}
      </section>
    </main>
  )
}
