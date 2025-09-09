// Simple debug script to test polls functionality
const { createClient } = require('@supabase/supabase-js');

// Create Supabase client directly
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'
);

async function debugPolls() {
  console.log('=== DEBUG: Starting polls debug ===');
  
  try {
    // Check if we can connect to the database
    console.log('=== DEBUG: Testing database connection...');
    
    // Simple polls query
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (pollsError) {
      console.error('=== DEBUG: Error fetching polls:', pollsError);
      return;
    }

    console.log('=== DEBUG: Found polls:', pollsData?.length || 0);
    console.log('=== DEBUG: Polls data:', pollsData);

    if (pollsData && pollsData.length > 0) {
      // Get options for these polls
      const pollIds = pollsData.map(poll => poll.id);
      const { data: optionsData, error: optionsError } = await supabase
        .from('options')
        .select('*')
        .in('poll_id', pollIds);

      console.log('=== DEBUG: Options:', optionsData?.length || 0, 'options');
      console.log('=== DEBUG: Options data:', optionsData);
    }

  } catch (error) {
    console.error('=== DEBUG: Critical error:', error);
  }
}

// Run the debug
debugPolls();