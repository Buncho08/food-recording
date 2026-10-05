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

  async function load() {
    const [{ data }, { count: beers }, { count: meals }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('meals').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_wasteful_outing', true),
      supabase.from('meals').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    if (data) { setProfile(data); setName(data.display_name) }
    setBeerCount(beers ?? 0)
    setMealCount(meals ?? 0)
  }

  useEffect(() => { load() }, [userId])

  async function save(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId)
    setSaving(false)
    load()
  }

  async function avatarChanged(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSaving(true)
    const blob = await compressImage(file, 700, 0.86)
    const path = `${userId}/avatar.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId)
    setSaving(false)
    load()
  }

  return (
    <main className="page-shell">
      <section className="profile-hero">
        <div className="avatar-edit"><Avatar name={profile?.display_name} path={profile?.avatar_path} size={92} /><label><Camera size={17} /><input type="file" accept="image/*" onChange={avatarChanged} /></label></div>
        <h1>{profile?.display_name || 'プロフィール'}</h1>
        <p>食費と体重を守るための戦績。</p>
      </section>

      <section className="stats-grid"><div><Beer size={22} /><strong>{beerCount}</strong><span>杯おごり</span></div><div><Utensils size={22} /><strong>{mealCount}</strong><span>食記録</span></div></section>

      <section className="card-section"><h2>プロフィール設定</h2><form className="stack-form" onSubmit={save}><label>表示名<input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required /></label><button className="secondary-button" disabled={saving}><Save size={17} />保存</button></form></section>
      <button className="danger-button" onClick={() => supabase.auth.signOut()}><LogOut size={18} />ログアウト</button>
    </main>
  )
}
