import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'
import { Database, Poll, Option, Vote, PollStatistics, PollResult } from '@/types/database'

// Use the appropriate client based on context
const getSupabaseClient = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return createClientComponentClient<Database>()
  }
  return serverSupabase
}

// Poll operations
export async function createPoll({ question, description, options }: { 
  question: string, 
  description: string | null, 
  options: string[] 
}) {
  try {
    const supabase = getSupabaseClient()
    console.log('Checking authentication...')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Authentication error:', authError)
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    
    if (!user) {
      console.error('No user found - user not authenticated')
      throw new Error('User not authenticated')
    }
    
    // Debug: Test basic connection
    console.log('User authenticated:', user.id)
    console.log('Testing basic query...')
    const testQuery = await supabase.from('polls').select('*').limit(1)
    console.log('Test query result:', testQuery)

    const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      question,
      description,
      user_id: user.id
    })
    .select()
    .single()

    // Debug: Log the actual response
    console.log('Poll insert response:', { data: poll, error: pollError })

    if (pollError) {
      console.error('Poll creation error details:', {
        message: pollError.message,
        details: pollError.details,
        hint: pollError.hint,
        code: pollError.code,
        fullError: JSON.stringify(pollError, null, 2)
      })
      throw new Error(`Failed to create poll: ${pollError.message || pollError.details || 'Unknown database error'}`)
    }

    if (!poll) {
      throw new Error('Failed to create poll: No data returned')
    }

    // Create options
    const optionsData = options.map(text => ({
      poll_id: poll.id,
      text
    }))

    const { error: optionsError } = await supabase
      .from('options')
      .insert(optionsData)

    if (optionsError) {
      console.error('Options creation error:', optionsError)
      // Rollback poll creation if options fail
      await supabase.from('polls').delete().eq('id', poll.id)
      throw new Error(`Failed to create options: ${optionsError.message}`)
    }

    return poll
  } catch (error) {
    console.error('Error in createPoll:', error)
    throw error
  }
}

export async function getAllPolls() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('polls')
    .select(`*, options(*, votes_count:votes(count))`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPolls() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('polls')
    .select(`*, options(*)`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getPollById(pollId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('polls')
    .select(`*, options(*)`)
    .eq('id', pollId)
    .single()

  if (error) throw error
  return data
}

export async function getUserPolls(userId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('polls')
    .select(`*, options(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Vote operations
export async function voteOnPoll(pollId: string, optionId: string) {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if user has already voted on this poll
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', user.id)
    .single()

  if (existingVote) {
    throw new Error('You have already voted on this poll')
  }

  const { error } = await supabase
    .from('votes')
    .insert({
      poll_id: pollId,
      option_id: optionId,
      user_id: user.id
    })

  if (error) throw error
  return true
}

export async function getPollResults(pollId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .rpc('get_poll_results', { poll_uuid: pollId })

  if (error) throw error
  return data
}

export async function getPollStatistics() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('poll_statistics')
    .select('*')

  if (error) throw error
  return data
}

export async function hasUserVoted(pollId: string, userId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') return false // Record not found
  return !!data
}

// Delete operations
export async function deletePoll(pollId: string) {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { error } = await supabase
    .from('polls')
    .delete()
    .eq('id', pollId)
    .eq('user_id', user.id)

  if (error) throw error
  return true
}

// Statistics
export async function getGlobalStats() {
  const supabase = getSupabaseClient()
  const { data: polls, error: pollsError } = await supabase
    .from('polls')
    .select('id')

  const { data: votes, error: votesError } = await supabase
    .from('votes')
    .select('id')

  if (pollsError || votesError) throw pollsError || votesError

  return {
    total_polls: polls?.length || 0,
    total_votes: votes?.length || 0,
    average_votes: polls?.length ? (votes?.length || 0) / polls.length : 0
  }
}