export type MealType = 'breakfast' | 'lunch' | 'dinner'

export type Profile = {
  id: string
  display_name: string
  avatar_path: string | null
  created_at: string
}

export type Comment = {
  id: string
  meal_id: string
  user_id: string
  body: string
  created_at: string
  profiles?: Pick<Profile, 'display_name' | 'avatar_path'> | null
}

export type WastefulVote = {
  meal_id: string
  user_id: string
  created_at?: string
}

export type Meal = {
  id: string
  user_id: string
  meal_date: string
  meal_type: MealType
  title: string
  note: string | null
  image_path: string | null
  created_at: string
  updated_at: string
  profiles?: Pick<Profile, 'display_name' | 'avatar_path'> | null
  comments?: Comment[]
  wasteful_votes?: WastefulVote[]
}
