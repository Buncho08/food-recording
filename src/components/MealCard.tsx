import { FormEvent, useMemo, useState } from 'react'
import { Beer, MessageCircle, Send, UtensilsCrossed } from 'lucide-react'
import Avatar from './Avatar'
import { publicStorageUrl, supabase } from '../lib/supabase'
import type { Meal } from '../types'

const mealLabels = { breakfast: '朝', lunch: '昼', dinner: '晩' }

export default function MealCard({ meal, currentUserId, onChanged, compact = false, votingAvailable = true }: {
  meal: Meal
  currentUserId: string
  onChanged: () => void
  compact?: boolean
  votingAvailable?: boolean
}) {
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const imageUrl = publicStorageUrl('meal-images', meal.image_path)
  const isOwner = meal.user_id === currentUserId
  const votes = meal.wasteful_votes ?? []
  const hasPenalty = votes.length > 0
  const votedByMe = votes.some((vote) => vote.user_id === currentUserId)
  const time = useMemo(
    () => new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(meal.created_at)),
    [meal.created_at],
  )

  async function toggleWasteVote() {
    if (isOwner || busy || !votingAvailable) return

    setBusy(true)
    try {
      if (votedByMe) {
        const { error } = await supabase
          .from('wasteful_votes')
          .delete()
          .eq('meal_id', meal.id)
          .eq('user_id', currentUserId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('wasteful_votes')
          .insert({ meal_id: meal.id, user_id: currentUserId })
        if (error) throw error
      }
      onChanged()
    } finally {
      setBusy(false)
    }
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

  const voteLabel = !votingAvailable
    ? '無駄な外食判定：準備中'
    : isOwner
      ? hasPenalty ? `友達から無駄な外食判定（${votes.length}票）` : '友達の判定待ち'
      : votedByMe ? '無駄な外食判定を取り消す' : '無駄な外食！'

  return (
    <article className={`meal-card ${compact ? 'compact' : ''}`}>
      <header className="meal-card-head">
        <div className="author">
          <Avatar name={meal.profiles?.display_name} path={meal.profiles?.avatar_path} size={38} />
          <div>
            <strong>{meal.profiles?.display_name || 'ユーザー'}</strong>
            <span>{meal.meal_date} · {mealLabels[meal.meal_type]} · {time}</span>
          </div>
        </div>
        {hasPenalty && <span className="beer-penalty"><Beer size={15} /> 1杯 · {votes.length}票</span>}
      </header>

      {imageUrl
        ? <img className="meal-photo" src={imageUrl} alt={meal.title} loading="lazy" />
        : <div className="meal-photo placeholder"><UtensilsCrossed /></div>}

      <div className="meal-body">
        <h3>{meal.title}</h3>
        {meal.note && <p>{meal.note}</p>}

        <button
          className={`waste-button ${votedByMe ? 'marked' : ''}`}
          onClick={toggleWasteVote}
          disabled={!votingAvailable || isOwner || busy}
          title={!votingAvailable ? 'Supabaseの投票用テーブル作成後に利用できます' : isOwner ? '自分の食事には判定できません' : votedByMe ? 'もう一度押すと取り消せます' : 'この食事を無駄な外食と判定'}
        >
          <Beer size={18} /> {voteLabel}
        </button>
      </div>

      <div className="comments">
        <div className="comment-title"><MessageCircle size={17} /><span>{meal.comments?.length ?? 0} コメント</span></div>
        {(meal.comments ?? []).map((c) => (
          <div className="comment" key={c.id}>
            <Avatar name={c.profiles?.display_name} path={c.profiles?.avatar_path} size={28} />
            <p><strong>{c.profiles?.display_name || 'ユーザー'}</strong> {c.body}</p>
          </div>
        ))}
        <form onSubmit={addComment} className="comment-form">
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="コメントする" maxLength={300} />
          <button disabled={busy || !comment.trim()}><Send size={17} /></button>
        </form>
      </div>
    </article>
  )
}
