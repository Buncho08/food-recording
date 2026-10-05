import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import MealCard from '../components/MealCard'
import { supabase } from '../lib/supabase'
import type { Meal } from '../types'

export default function TimelinePage({ userId }: { userId: string }) {
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('meals').select('*, profiles(display_name, avatar_path), comments(*, profiles(display_name, avatar_path))').order('created_at', { ascending: false }).limit(50)
    setMeals((data ?? []) as Meal[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const channel = supabase.channel('food-recording-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'meals' }, load).on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, load).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <main className="page-shell">
      <header className="page-header"><div><p className="eyebrow">FRIENDS</p><h1>みんなの食事</h1><p>食事を見守る。無駄な外食は見逃さない。</p></div><button className="icon-button" onClick={load} aria-label="更新"><RefreshCw size={20} className={loading ? 'spin' : ''} /></button></header>
      <section className="feed">{meals.length ? meals.map((meal) => <MealCard key={meal.id} meal={meal} currentUserId={userId} onChanged={load} />) : <div className="empty-state"><span>👀</span><strong>投稿がまだありません</strong><p>最初の一食を記録してください。</p></div>}</section>
    </main>
  )
}
