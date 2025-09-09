-- Ensure users can edit their own polls
-- Run these SQL commands in Supabase to enable poll editing

-- Update RLS policies for polls table
DROP POLICY IF EXISTS "Users can update own polls" ON polls;
CREATE POLICY "Users can update own polls" ON polls 
FOR UPDATE USING (
  auth.uid() = user_id
);

-- Ensure options table allows editing
DROP POLICY IF EXISTS "Users can edit options" ON options;
CREATE POLICY "Users can edit options" ON options 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM polls 
    WHERE polls.id = options.poll_id 
    AND polls.user_id = auth.uid()
  )
);

-- Ensure votes table allows viewing (but not editing others' votes)
DROP POLICY IF EXISTS "Users can view all votes" ON votes;
CREATE POLICY "Users can view all votes" ON votes 
FOR SELECT USING (true);

-- Grant necessary permissions
GRANT UPDATE ON polls TO authenticated;
GRANT UPDATE, DELETE, INSERT ON options TO authenticated;
GRANT SELECT ON votes TO authenticated;