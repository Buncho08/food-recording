import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Beer, Camera, LogOut, Save, Utensils } from 'lucide-react'
import Avatar from '../components/Avatar'
import { compressImage } from '../lib/image'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export default function ProfilePage({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [beerCount, setBeerCount] = useState(0)
  const [mealCount, setMealCount] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [profileResult, mealResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('meals').select('id').eq('user_id', userId),
    ])

    if (profileResult.data) {
      setProfile(profileResult.data)
      setName(profileResult.data.display_name)
    }

    const mealIds = (mealResult.data ?? []).map((meal) => meal.id)
    setMealCount(mealIds.length)

    if (mealIds.length === 0) {
      setBeerCount(0)
      return
    }

    const voteResult = await supabase
      .from('wasteful_votes')
      .select('meal_id')
      .in('meal_id', mealIds)

    setBeerCount(
      voteResult.error
        ? 0
        : new Set((voteResult.data ?? []).map((vote) => vote.meal_id)).size,
    )
  }

  useEffect(() => { load() }, [userId])

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: name.trim() })
      .eq('id', userId)

    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    load()
  }

  async function avatarChanged(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving(true)
    setError('')

    try {
      const blob = await compressImage(file, 700, 0.86)
      const path = `${userId}/${crypto.randomUUID()}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: false, contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const previousPath = profile?.avatar_path ?? null
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_path: path })
        .eq('id', userId)

      if (profileError) {
        await supabase.storage.from('avatars').remove([path])
        throw profileError
      }

      if (previousPath && previousPath !== path) {
        await supabase.storage.from('avatars').remove([previousPath])
      }

      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'アイコンの変更に失敗しました')
    } finally {
      setSaving(false)
      e.target.value = ''
    }
  }

  return (
    <main className="page-shell">
      <section className="profile-hero">
        <div className="avatar-edit">
          <Avatar name={profile?.display_name} path={profile?.avatar_path} size={92} />
          <label aria-label="アイコン画像を変更">
            <Camera size={17} />
            <input type="file" accept="image/*" onChange={avatarChanged} disabled={saving} />
          </label>
        </div>
        <h1>{profile?.display_name || 'プロフィール'}</h1>
        <p>食費と体重を守るための戦績。</p>
        <label className="avatar-change-button">
          <Camera size={16} /> {saving ? '画像を処理中…' : 'アイコンを変更'}
          <input type="file" accept="image/*" onChange={avatarChanged} disabled={saving} />
        </label>
        {error && <p className="form-message error profile-error">{error}</p>}
      </section>

      <section className="stats-grid">
        <div><Beer size={22} /><strong>{beerCount}</strong><span>杯おごり</span></div>
        <div><Utensils size={22} /><strong>{mealCount}</strong><span>食記録</span></div>
      </section>

      <section className="card-section">
        <h2>プロフィール設定</h2>
        <form className="stack-form" onSubmit={save}>
          <label>表示名<input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required /></label>
          <button className="secondary-button" disabled={saving}><Save size={17} />保存</button>
        </form>
      </section>

      <button className="danger-button" onClick={() => supabase.auth.signOut()}><LogOut size={18} />ログアウト</button>
    </main>
  )
}
