import { supabase } from './supabase'
import type { Comment, Meal, Profile, WastefulVote } from '../types'

export async function hydrateMeals(baseMeals: Meal[]) {
  if (baseMeals.length === 0) {
    return {
      meals: [] as Meal[],
      votingAvailable: true,
      voteError: '',
    }
  }

  const mealIds = baseMeals.map((meal) => meal.id)

  const [commentsResult, votesResult] = await Promise.all([
    supabase
      .from('comments')
      .select('*')
      .in('meal_id', mealIds)
      .order('created_at', { ascending: true }),
    supabase
      .from('wasteful_votes')
      .select('meal_id, user_id, created_at')
      .in('meal_id', mealIds),
  ])

  const comments = (commentsResult.data ?? []) as Comment[]
  const votes = votesResult.error ? [] : ((votesResult.data ?? []) as WastefulVote[])

  const profileIds = Array.from(new Set([
    ...baseMeals.map((meal) => meal.user_id),
    ...comments.map((comment) => comment.user_id),
  ]))

  const profilesResult = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, display_name, avatar_path, created_at')
        .in('id', profileIds)
    : { data: [], error: null }

  const profiles = (profilesResult.data ?? []) as Profile[]
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))

  const commentsByMeal = new Map<string, Comment[]>()
  for (const comment of comments) {
    const hydratedComment: Comment = {
      ...comment,
      profiles: profileMap.get(comment.user_id) ?? null,
    }
    const current = commentsByMeal.get(comment.meal_id) ?? []
    current.push(hydratedComment)
    commentsByMeal.set(comment.meal_id, current)
  }

  const votesByMeal = new Map<string, WastefulVote[]>()
  for (const vote of votes) {
    const current = votesByMeal.get(vote.meal_id) ?? []
    current.push(vote)
    votesByMeal.set(vote.meal_id, current)
  }

  const meals = baseMeals.map((meal) => ({
    ...meal,
    profiles: profileMap.get(meal.user_id) ?? null,
    comments: commentsByMeal.get(meal.id) ?? [],
    wasteful_votes: votesByMeal.get(meal.id) ?? [],
  }))

  return {
    meals,
    votingAvailable: !votesResult.error,
    voteError: votesResult.error ? `判定機能エラー: ${votesResult.error.message}` : '',
  }
}
