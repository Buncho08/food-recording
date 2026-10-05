import { useEffect, useMemo, useState } from 'react'
import { Beer, Plus } from 'lucide-react'
import MealComposer from '../components/MealComposer'
import MealCard from '../components/MealCard'
import { supabase } from '../lib/supabase'
import type { Meal, MealType, WastefulVote } from '../types'

const baseSelect = '*, profiles(display_name, avatar_path), comments(*, profiles(display_name, avatar_path))'

const mealInfo: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: '朝ごはん', emoji: '☀️' },
  { type: 'lunch', label: '昼ごはん', emoji: '🍙' },
  { type: 'dinner', label: '晩ごはん', emoji: '🌙' },
]

function todayString() {
  const d = new Date()
  const tzOffset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10)
}

function attachVotes(meals: Meal[], votes: WastefulVote[]) {
  return meals.map((meal) => ({
    ...meal,
    wasteful_votes: votes.filter((vote) => vote.meal_id === meal.id),
  }))
}

export default function TodayPage({ userId }: { userId: string }) {
  const date = useMemo(todayString, [])
  const [meals, setMeals] = useState<Meal[]>([])
  const [composer, setComposer] = useState<MealType | null>(null)
  const [beerCount, setBeerCount] = useState(0)
  const [votingAvailable, setVotingAvailable] = useState(true)

  async function load() {
    const [todayResult, allMealsResult] = await Promise.all([
      supabase
        .from('meals')
        .select(baseSelect)
        .eq('user_id', userId)
        .eq('meal_date', date)
        .order('created_at', { ascending: false }),
      supabase
        .from('meals')
        .select('id')
        .eq('user_id', userId),
    ])

    const todayMeals = (todayResult.data ?? []) as Meal[]
    const allMealIds = (allMealsResult.data ?? []).map((meal) => meal.id)

    if (allMealIds.length === 0) {
      setMeals(todayMeals.map((meal) => ({ ...meal, wasteful_votes: [] })))
      setBeerCount(0)
      setVotingAvailable(true)
      return
    }

    const voteResult = await supabase
      .from('wasteful_votes')
      .select('meal_id, user_id, created_at')
      .in('meal_id', allMealIds)

    if (voteResult.error) {
      setMeals(todayMeals.map((meal) => ({ ...meal, wasteful_votes: [] })))
      setBeerCount(0)
      setVotingAvailable(false)
      return
    }

    const votes = (voteResult.data ?? []) as WastefulVote[]
    const todayIds = new Set(todayMeals.map((meal) => meal.id))

    setMeals(attachVotes(todayMeals, votes.filter((vote) => todayIds.has(vote.meal_id))))
    setBeerCount(new Set(votes.map((vote) => vote.meal_id)).size)
    setVotingAvailable(true)
  }

  useEffect(() => { load() }, [date, userId])

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">TODAY · {date}</p>
          <h1>今日、何食べた？</h1>
          <p>3食埋めたら勝ち。外食の言い訳は負け。</p>
        </div>
        <div className="beer-score"><Beer size={23} /><strong>{beerCount}</strong><span>杯おごり</span></div>
      </section>

      <section className="meal-slots">
        {mealInfo.map(({ type, label, emoji }) => {
          const current = meals.find((meal) => meal.meal_type === type)
          return (
            <div className={`meal-slot ${current ? 'done' : ''}`} key={type}>
              <span className="slot-emoji">{emoji}</span>
              <div><strong>{label}</strong><span>{current ? current.title : 'まだ記録なし'}</span></div>
              <button onClick={() => setComposer(type)}><Plus size={18} />{current ? '追加' : '記録'}</button>
            </div>
          )
        })}
      </section>

      <div className="section-title"><div><p className="eyebrow">MY RECORD</p><h2>今日の記録</h2></div></div>
      <section className="feed">
        {meals.length
          ? meals.map((meal) => <MealCard key={meal.id} meal={meal} currentUserId={userId} onChanged={load} compact votingAvailable={votingAvailable} />)
          : <div className="empty-state"><span>🍽️</span><strong>まだ何も食べてない…？</strong><p>食べたら忘れる前に記録してください。</p></div>}
      </section>

      {composer && <MealComposer userId={userId} mealType={composer} date={date} onClose={() => setComposer(null)} onSaved={load} />}
    </main>
  )
}
