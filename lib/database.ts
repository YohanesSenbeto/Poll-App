import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { supabase as serverSupabase } from './supabase'
import { Poll } from './types'
import { notificationService } from './email'

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

    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title: title,
        description,
        user_id: user.id
      })
      .select()
      .single()

    if (pollError) {
      const msg = pollError.message || pollError.details || 'Unknown database error'
      throw new Error(`Failed to create poll: ${msg}`)
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
      // Rollback poll creation if options fail
      await supabase.from('polls').delete().eq('id', poll.id)
      throw new Error(`Failed to create options: ${optionsError.message || 'Unknown database error'}`)
    }

    // Update analytics tables using new schema (best-effort only)
    try {
      const { error: analyticsError } = await supabase
        .from('poll_analytics')
        .insert({
          metric_type: 'poll_created',
          user_id: user.id,
          poll_id: poll.id,
          value: 1
        });
      if (analyticsError) {
        // Ignore analytics errors
        // console.warn('Analytics insert failed:', analyticsError)
      }

      const programmingLanguages = [
        'javascript','python','typescript','java','csharp','cpp','go','rust','php','ruby','swift','kotlin','sql','html-css','react','vue','angular','nodejs','django','flask','spring','laravel','express'
      ]
      const lowerTitle = title.toLowerCase();
      const lowerDescription = (description || '').toLowerCase();
      for (const lang of programmingLanguages) {
        if (lowerTitle.includes(lang) || lowerDescription.includes(lang)) {
          await supabase
            .from('poll_analytics')
            .insert({ metric_type: 'language_mentioned', language_name: lang, user_id: user.id, poll_id: poll.id, value: 1 })
        }
      }

      const { error: incErr } = await supabase.rpc('increment_daily_metrics', { p_metric_type: 'poll_created' })
      if (incErr) {
        // ignore analytics errors
      }

    } catch (_) {
      // swallow analytics failures
    }

    // Send poll creation notification (best-effort)
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('full_name, notification_preferences')
        .eq('id', user.id)
        .single()

      if (userProfile?.notification_preferences?.pollCreated !== false) {
        await notificationService.sendPollCreatedEmail(
          user.email!,
          userProfile?.full_name || user.email!,
          title,
          poll.id
        )
      }
    } catch (emailError) {
      // Email failures should not prevent poll creation
      console.warn('Failed to send poll creation email:', emailError)
    }

    return poll
  } catch (error) {
    // Surface clean error
    const message = error instanceof Error ? error.message : 'Failed to create poll'
    console.error('Error in createPoll:', message)
    throw new Error(message)
  }
}

// Poll operations
// Optimized getAllPolls function that works for all users
export async function getAllPolls() {
  const supabase = getSupabaseClient();
  
  try {
    console.log('Starting optimized getAllPolls...');
    
    // Single optimized query using joins - no auth required
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select(`
        *,
        options(*),
        votes: votes(id, option_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (pollsError) {
      console.error('Error fetching polls:', pollsError);
      return [];
    }

    if (!pollsData || pollsData.length === 0) {
      console.log('No polls found');
      return [];
    }

    console.log(`Found ${pollsData.length} polls with optimized query`);

    // Process the data efficiently
    const processedPolls = pollsData.map((poll: any) => {
      const optionsWithVotes = (poll.options || []).map((option: any) => ({
        ...option,
        votes_count: (poll.votes || []).filter((vote: any) => vote.option_id === option.id).length
      }));

      return {
        ...poll,
        options: optionsWithVotes
      };
    });

    return processedPolls;

  } catch (error) {
    console.error('Error in optimized getAllPolls:', error instanceof Error ? error.message : String(error));
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

  // Best-effort: store latest voted option text locally for UI highlighting
  if (typeof window !== 'undefined') {
    try {
      const { data: opt } = await supabase
        .from('options')
        .select('text')
        .eq('id', optionId)
        .single();
      if (opt?.text) {
        window.localStorage.setItem('poll-app:lastVotedOptionText', String(opt.text));
        window.localStorage.setItem('poll-app:lastVotedAt', new Date().toISOString());
      }
    } catch {
      // ignore local cache failures
    }
  }

  // Update analytics tables
  try {
    // Increment daily metrics
    const today = new Date().toISOString().split('T')[0];
    const { error: dailyError } = await supabase.rpc('increment_daily_metrics', {
      p_date: today,
      p_poll_count: 0,
      p_vote_count: 1
    });
    
    if (dailyError) {
      console.warn('Failed to increment daily metrics:', dailyError);
    }

    // Get poll details to check for programming languages
    const { data: poll } = await supabase
      .from('polls')
      .select('title, description')
      .eq('id', pollId)
      .single();

    if (poll) {
      const programmingLanguages = [
        'javascript', 'python', 'typescript', 'java', 'csharp', 'cpp', 'c', 'go', 
        'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala', 'dart', 'r', 'sql'
      ];
      
      const lowerTitle = poll.title.toLowerCase();
      const lowerDescription = poll.description?.toLowerCase() || '';
      
      for (const lang of programmingLanguages) {
        if (lowerTitle.includes(lang) || lowerDescription.includes(lang)) {
          const { error: langError } = await supabase.rpc('increment_language_demand', {
            p_language_name: lang,
            p_poll_mention: 0,
            p_vote_count: 1
          });
          
          if (langError) {
            console.warn(`Failed to increment language demand for ${lang}:`, langError);
          }
        }
      }
    }

    // Record user session activity
    const { error: sessionError } = await supabase.from('user_sessions').insert({
      user_id: user.id,
      session_type: 'vote_cast',
      poll_id: pollId,
      created_at: new Date().toISOString()
    });
    
    if (sessionError) {
      console.warn('Failed to record session activity:', sessionError);
    }

  } catch (analyticsError) {
    // Analytics errors should not prevent voting
    console.warn('Analytics update failed:', analyticsError);
  }

  // Send vote notification to poll creator (best-effort)
  try {
    // Get poll creator and their notification preferences
    const { data: poll } = await supabase
      .from('polls')
      .select(`
        user_id,
        title,
        creator:user_profiles!inner(full_name, notification_preferences)
      `)
      .eq('id', pollId)
      .single()

    if (poll?.creator?.[0]?.notification_preferences?.pollVoteReceived !== false) {
      // Get voter's name
      const { data: voterProfile } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // Get poll creator's email
      const { data: creatorAuth } = await supabase.auth.admin.getUserById(poll!.user_id)

      await notificationService.sendVoteReceivedEmail(
        creatorAuth.user?.email || poll!.creator?.[0]?.full_name || 'Poll Creator',
        poll!.creator?.[0]?.full_name || 'Poll Creator',
        poll!.title,
        pollId,
        voterProfile?.full_name || 'Anonymous'
      )
    }
  } catch (emailError) {
    // Email failures should not prevent voting
    console.warn('Failed to send vote notification email:', emailError)
  }

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
  const supabase = getSupabaseClient();
  
  try {
    console.log('Starting optimized getPollStatistics...');
    
    // Simple direct queries without auth requirement
    const [pollsResult, votesResult, usersResult] = await Promise.all([
      supabase.from('polls').select('id, is_active'),
      supabase.from('votes').select('id'),
      supabase.from('users').select('id').limit(1)
    ]);

    const polls = pollsResult.data || [];
    const votes = votesResult.data || [];
    
    const activePolls = polls.filter(poll => poll.is_active).length;
    const totalPolls = polls.length;
    const totalVotes = votes.length;
    const averageVotes = totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;

    return {
      total_polls: totalPolls,
      total_votes: totalVotes,
      average_votes: averageVotes,
      active_polls: activePolls,
      inactive_polls: totalPolls - activePolls,
      total_users: 1 // Placeholder since we can't get accurate user count
    };

  } catch (error) {
    console.error('Error in optimized getPollStatistics:', error instanceof Error ? error.message : String(error));
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
export async function deletePoll(pollId: string, isAdmin = false) {
  const supabase = getSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Check if user is admin
  if (!isAdmin) {
    // Regular user can only delete their own polls
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)
      .eq('user_id', user.id)

    if (error) throw error
  } else {
    // Admin can delete any poll
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)

    if (error) throw error
  }
  
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

export async function getPollsSummary(limit: number = 24, userId?: string) {
  const supabase = getSupabaseClient();

  let base = supabase
    .from('polls')
    .select('id, title, description, user_id, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Respect RLS: show active polls or the user's own polls
  if (userId) {
    base = base.or(`is_active.eq.true,user_id.eq.${userId}`);
  } else {
    base = base.eq('is_active', true);
  }

  const [pollsRes, statsRes] = await Promise.all([
    base,
    supabase
      .from('poll_statistics')
      .select('poll_id, total_votes, option_count')
  ]);

  const polls = pollsRes.data || [];
  const pollsError = pollsRes.error;
  const stats = statsRes.data || [];

  if (pollsError && polls.length === 0) {
    // Silent fallback to empty to avoid noisy console in production
    return [] as any[];
  }

  const statsMap = new Map<string, { total_votes: number; option_count: number }>();
  (stats || []).forEach((s: any) => statsMap.set(s.poll_id, { total_votes: s.total_votes, option_count: s.option_count }));

  return polls.map((p: any) => {
    const s = statsMap.get(p.id) || { total_votes: 0, option_count: 0 };
    return {
      ...p,
      total_votes: s.total_votes,
      option_count: s.option_count,
    };
  });
}

export async function getLanguageCatalog(): Promise<string[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('language_catalog')
      .select('name')
      .order('name');

    if (error) {
      console.warn('getLanguageCatalog error:', error);
      return [];
    }

    return (data || []).map((r: any) => r.name).filter((n: any) => typeof n === 'string' && n.trim().length > 0);
  } catch (e) {
    console.warn('getLanguageCatalog exception:', e);
    return [];
  }
}