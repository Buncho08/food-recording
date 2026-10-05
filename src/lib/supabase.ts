import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zftgiwtjiboqhcekedre.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdGdpd3RqaWJvcWhjZWtlZHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNjQ5MzcsImV4cCI6MjEwNjc0MDkzN30.hzhcV5GENtZwaxDYaxxevL9QuaZBw1sD0-XrHb8u8RY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function publicStorageUrl(bucket: 'meal-images' | 'avatars', path?: string | null) {
  if (!path) return null
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}
