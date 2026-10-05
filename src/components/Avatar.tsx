import { publicStorageUrl } from '../lib/supabase'

export default function Avatar({ name, path, size = 42 }: { name?: string | null; path?: string | null; size?: number }) {
  const url = publicStorageUrl('avatars', path)
  return url ? (
    <img className="avatar" src={url} alt={name ?? 'ユーザー'} style={{ width: size, height: size }} />
  ) : (
    <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{(name || '?').slice(0, 1)}</div>
  )
}
