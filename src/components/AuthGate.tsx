import { FormEvent, useState } from 'react'
import { Beer, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Props = {
  children: React.ReactNode
  signedIn: boolean
  loading: boolean
}

export default function AuthGate({ children, signedIn, loading }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (loading) {
    return <div className="screen-center"><Loader2 className="spin" size={28} /></div>
  }
  if (signedIn) return children

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() || email.split('@')[0] } },
        })
        if (error) throw error
        setMessage('登録しました。確認メールが届いた場合は、メール内のリンクを開いてください。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="logo-badge"><Beer size={30} /></div>
        <p className="eyebrow">FOOD CHECK WITH FRIENDS</p>
        <h1>めしログ</h1>
        <p className="muted">朝・昼・晩を残して、無駄な外食はビール1杯。</p>

        <div className="segmented auth-segment">
          <button className={mode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>ログイン</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>新規登録</button>
        </div>

        <form onSubmit={submit} className="stack-form">
          {mode === 'signup' && (
            <label>表示名<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="ぶんちょう" required /></label>
          )}
          <label>メール<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
          <label>パスワード<input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6文字以上" required /></label>
          <button className="primary-button" disabled={busy}>{busy ? <Loader2 className="spin" size={18} /> : mode === 'signin' ? 'ログインする' : '登録する'}</button>
        </form>
        {message && <p className="form-message">{message}</p>}
      </section>
    </main>
  )
}
