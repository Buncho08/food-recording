import { FormEvent, useMemo, useState } from 'react'
import { Beer, MessageCircle, Send, UtensilsCrossed } from 'lucide-react'
import Avatar from './Avatar'
import { publicStorageUrl, supabase } from '../lib/supabase'
import type { Meal } from '../types'

const mealLabels = { breakfast: '朝', lunch: '昼', dinner: '晩' }

export default function MealCard({ meal, currentUserId, onChanged, compact = false }: {
  meal: Meal
  currentUserId: string
  onChanged: () => void
  compact?: boolean
}) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const imageUrl = publicStorageUrl('meal-images', meal.image_path)
  const isOwner = meal.user_id === currentUserId
  const time = useMemo(() => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(meal.created_at)), [meal.created_at])

  async function toggleWaste() {
    if (!isOwner) return
    setBusy(true)
    await supabase.from('meals').update({ is_wasteful_outing: !meal.is_wasteful_outing }).eq('id', meal.id)
    setBusy(false)
    onChanged()
  }

  async function addComment(e: FormEvent) {
    e.preventDefault()
    const body = comment.trim()
    if (!body) return
    setBusy(true)
    const { error } = await supabase.from('comments').insert({ meal_id: meal.id, user_id: currentUserId, body })
    setBusy(false)
    if (!error) {
      setComment('')
      onChanged()
    }
  }

  return (
    <article className={`meal-card ${compact ? 'compact' : ''}`}>
      <header className="meal-card-head">
        <div className="author"><Avatar name={meal.profiles?.display_name} path={meal.profiles?.avatar_path} size={38} /><div><strong>{meal.profiles?.display_name || 'ユーザー'}</strong><span>{meal.meal_date} · {mealLabels[meal.meal_type]} · {time}</span></div></div>
        {meal.is_wasteful_outing && <span className="beer-penalty"><Beer size={15} /> 1杯</span>}
      </header>

      {imageUrl ? <img className="meal-photo" src={imageUrl} alt={meal.title} loading="lazy" /> : <div className="meal-photo placeholder"><UtensilsCrossed /></div>}

      <div className="meal-body">
        <h3>{meal.title}</h3>
        {meal.note && <p>{meal.note}</p>}
        <button className={`waste-button ${meal.is_wasteful_outing ? 'marked' : ''}`} onClick={toggleWaste} disabled={!isOwner || busy} title={isOwner ? '' : '判定は投稿者本人が変更できます'}>
          <Beer size={18} /> {meal.is_wasteful_outing ? '無駄な外食：判定済み' : '無駄な外食だった'}
        </button>
      </div>

      <div className="comments">
        <div className="comment-title"><MessageCircle size={17} /><span>{meal.comments?.length ?? 0} コメント</span></div>
        {(meal.comments ?? []).map((c) => (
          <div className="comment" key={c.id}><Avatar name={c.profiles?.display_name} path={c.profiles?.avatar_path} size={28} /><p><strong>{c.profiles?.display_name || 'ユーザー'}</strong> {c.body}</p></div>
        ))}
        <form onSubmit={addComment} className="comment-form"><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="コメントする" maxLength={300} /><button disabled={busy || !comment.trim()}><Send size={17} /></button></form>
      </div>
    </article>
  )
}
