import { FormEvent, useEffect, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { compressImage } from '../lib/image'
import { supabase } from '../lib/supabase'
import type { MealType } from '../types'

const mealLabels: Record<MealType, string> = { breakfast: '朝ごはん', lunch: '昼ごはん', dinner: '晩ごはん' }

export default function MealComposer({ userId, mealType, date, onClose, onSaved }: {
  userId: string
  mealType: MealType
  date: string
  onClose: () => void
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    let imagePath: string | null = null
    try {
      if (file) {
        const image = await compressImage(file)
        imagePath = `${userId}/${crypto.randomUUID()}.jpg`
        const { error: uploadError } = await supabase.storage.from('meal-images').upload(imagePath, image, { contentType: 'image/jpeg', upsert: false })
        if (uploadError) throw uploadError
      }

      const { error: insertError } = await supabase.from('meals').insert({
        user_id: userId,
        meal_date: date,
        meal_type: mealType,
        title: title.trim(),
        note: note.trim() || null,
        image_path: imagePath,
      })
      if (insertError) throw insertError
      onSaved()
      onClose()
    } catch (err) {
      if (imagePath) await supabase.storage.from('meal-images').remove([imagePath])
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet-header"><div><p className="eyebrow">{date}</p><h2>{mealLabels[mealType]}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
        <form className="stack-form" onSubmit={submit}>
          <label className="photo-picker">
            {preview ? <img src={preview} alt="選択した食事" /> : <><Camera size={28} /><strong>写真を追加</strong><span>カメラ・フォトライブラリ</span></>}
            <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <label>食べたもの<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例：鮭おにぎりと味噌汁" required /></label>
          <label>ひとこと<textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="量、気分、店名など（任意）" rows={3} /></label>
          {error && <p className="form-message error">{error}</p>}
          <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : '記録する'}</button>
        </form>
      </section>
    </div>
  )
}
