import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'
import { Poll } from './types'

// Use the appropriate client based on context
const getSupabaseClient = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    return createClientComponentClient()
  }
  return serverSupabase
}

// Helper function to check authentication
async function checkAuthentication() {
  const supabase = getSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    console.error('Authentication check failed:', error)
    if (error?.message?.includes('Auth session missing')) {
      throw new Error('Authentication session expired. Please login again to continue.')
    }
    if (error?.message?.includes('JWT')) {
      throw new Error('Authentication token invalid. Please login again.')
    }
    throw new Error('Please login to continue')
  }
  
  return user
}

// Poll operations
export async function createPoll({ title, description, options }: { 
  title: string,
  description: string | null, 
  options: string[] 
}) {
  try {
    const supabase = getSupabaseClient()
    const user = await checkAuthentication()
    console.log('User authenticated:', user.id)
    
    // Debug: Test basic connection
    console.log('Testing basic query...')
    const testQuery = await supabase.from('polls').select('*').limit(1)
    console.log('Test query result:', testQuery)

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: title,
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

export async function getAllPolls(): Promise<Poll[]> {
  const supabase = getSupabaseClient();
  
  try {
    // Simple, direct query that avoids any profiles table issues
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        options(
          id,
          text,
          poll_id
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching polls:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get votes for these polls
    const pollIds = data.map(p => p.id);
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('option_id, poll_id')
      .in('poll_id', pollIds);

    // Count votes per option
    const voteCounts = new Map();
    votes?.forEach(vote => {
      voteCounts.set(vote.option_id, (voteCounts.get(vote.option_id) || 0) + 1);
    });

    // Return polls with vote counts
    return data.map(poll => ({
      ...poll,
      options: (poll.options || []).map(option => ({
        ...option,
        votes_count: voteCounts.get(option.id) || 0
      }))
    }));

  } catch (error) {
    console.error('Error in getAllPolls:', error instanceof Error ? error.message : String(error));
    return [];
  }
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
  const user = await checkAuthentication()

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
  
  try {
    console.log('Starting getPollStatistics with direct queries...');
    
    // First, check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user');
      return {
        total_polls: 0,
        total_votes: 0,
        average_votes: 0,
        active_polls: 0,
        inactive_polls: 0,
        total_users: 0
      };
    }

    // Get all polls (try admin access first, fallback to active only)
    let polls: any[] = [];
    
    const { data: allPolls, error: allError } = await supabase.from('polls').select('*');
    
    if (!allError && allPolls) {
      polls = allPolls;
    } else {
      // Fallback to active polls only
      const { data: activePolls, error: activeError } = await supabase
        .from('polls')
        .select('*')
        .eq('is_active', true);
      
      if (activeError) {
        console.error('Error fetching polls for stats:', activeError);
        return {
          total_polls: 0,
          total_votes: 0,
          average_votes: 0,
          active_polls: 0,
          inactive_polls: 0,
          total_users: 0
        };
      }
      
      polls = activePolls || [];
    }

    // Get all votes
    const { data: votes, error: votesError } = await supabase
      .from('votes')
      .select('*');

    if (votesError) {
      console.error('Error fetching votes for stats:', votesError);
    }

    // Get user count - use a safe approach
    let totalUsers = 0;
    try {
      // Count distinct user IDs from polls and votes
      const uniqueUserIds = new Set();
      
      // Add users from polls
      polls.forEach(poll => {
        if (poll.user_id) uniqueUserIds.add(poll.user_id);
      });
      
      // Add users from votes
      votes?.forEach(vote => {
        if (vote.user_id) uniqueUserIds.add(vote.user_id);
      });
      
      totalUsers = uniqueUserIds.size;
    } catch (userCountError) {
      console.error('Error counting users:', userCountError);
      totalUsers = 0;
    }

    const totalPolls = polls?.length || 0;
    const totalVotes = votes?.length || 0;
    const activePolls = polls?.filter(p => p.is_active).length || 0;
    const inactivePolls = totalPolls - activePolls;
    const averageVotes = totalPolls > 0 ? totalVotes / totalPolls : 0;

    return {
      total_polls: totalPolls,
      total_votes: totalVotes,
      average_votes: parseFloat(averageVotes.toFixed(2)),
      active_polls: activePolls,
      inactive_polls: inactivePolls,
      total_users: totalUsers
    };

  } catch (error) {
    console.error('Critical error in getPollStatistics:', {
      error: error,
      message: error instanceof Error ? error.message : String(error)
    });
    
    return {
      total_polls: 0,
      total_votes: 0,
      average_votes: 0,
      active_polls: 0,
      inactive_polls: 0,
      total_users: 0
    };
  }
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

export async function updatePoll(pollId: string, { title, description, options }: { 
  title: string, 
  description: string | null, 
  options: string[] 
}) {
  try {
    const supabase = getSupabaseClient()
    const user = await checkAuthentication()
    
    // Check if the poll belongs to the current user
    const { data: existingPoll, error: pollCheckError } = await supabase
      .from('polls')
      .select('user_id')
      .eq('id', pollId)
      .single()

    if (pollCheckError) {
      throw new Error(`Failed to check poll ownership: ${pollCheckError.message}`)
    }

    if (!existingPoll) {
      throw new Error('Poll not found')
    }

    if (existingPoll.user_id !== user.id) {
      throw new Error('You can only edit your own polls')
    }

    // Check if poll has any votes
    const { count: voteCount, error: voteCountError } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('poll_id', pollId)

    if (voteCountError) {
      throw new Error(`Failed to check votes: ${voteCountError.message}`)
    }

    if (voteCount && voteCount > 0) {
      throw new Error('Cannot edit a poll that already has votes')
    }

    // Update poll
    const { data: updatedPoll, error: updateError } = await supabase
      .from('polls')
      .update({
        title,
        description,
        updated_at: new Date().toISOString()
      })
      .eq('id', pollId)
      .select()
      .single()

    if (updateError) {
      throw new Error(`Failed to update poll: ${updateError.message}`)
    }

    // Delete existing options
    const { error: deleteOptionsError } = await supabase
      .from('options')
      .delete()
      .eq('poll_id', pollId)

    if (deleteOptionsError) {
      throw new Error(`Failed to delete existing options: ${deleteOptionsError.message}`)
    }

    // Create new options
    const optionsData = options.map(text => ({
      poll_id: pollId,
      text
    }))

    const { data: newOptions, error: createOptionsError } = await supabase
      .from('options')
      .insert(optionsData)
      .select()

    if (createOptionsError) {
      throw new Error(`Failed to create new options: ${createOptionsError.message}`)
    }

    return {
      ...updatedPoll,
      options: newOptions || []
    }
  } catch (error) {
    console.error('Error in updatePoll:', error)
    throw error
  }
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