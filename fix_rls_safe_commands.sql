-- Safe RLS policy commands to handle existing policies
-- Use these commands one by one in Supabase SQL editor

-- Step 1: List existing policies to see what's already there
SELECT schemaname, tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('polls', 'options', 'votes');

-- Step 2: Drop policies individually (run only if they exist)
-- For polls table
DROP POLICY IF EXISTS "Users can view all polls" ON polls; 
DROP POLICY IF EXISTS "Users can create polls" ON polls; 
DROP POLICY IF EXISTS "Users can update own polls" ON polls; 
DROP POLICY IF EXISTS "Users can delete own polls" ON polls; 

-- For options table  
DROP POLICY IF EXISTS "Users can view all options" ON options; 
DROP POLICY IF EXISTS "Users can create options" ON options; 
DROP POLICY IF EXISTS "Users can update options" ON options; 
DROP POLICY IF EXISTS "Users can delete options" ON options; 

-- For votes table
DROP POLICY IF EXISTS "Users can view all votes" ON votes; 
DROP POLICY IF EXISTS "Users can create votes" ON votes; 
DROP POLICY IF EXISTS "Users can update own votes" ON votes; 
DROP POLICY IF EXISTS "Users can delete own votes" ON votes; 

-- Step 3: Create new policies (these won't fail if policies don't exist)
CREATE POLICY "Users can view all polls" ON polls FOR SELECT USING (true); 
CREATE POLICY "Users can create polls" ON polls FOR INSERT WITH CHECK (auth.uid() = user_id); 
CREATE POLICY "Users can update own polls" ON polls FOR UPDATE USING (auth.uid() = user_id); 
CREATE POLICY "Users can delete own polls" ON polls FOR DELETE USING (auth.uid() = user_id); 

CREATE POLICY "Users can view all options" ON options FOR SELECT USING (true); 
CREATE POLICY "Users can create options" ON options FOR INSERT WITH CHECK (true); 
CREATE POLICY "Users can update options" ON options FOR UPDATE USING (true); 
CREATE POLICY "Users can delete options" ON options FOR DELETE USING (true); 

CREATE POLICY "Users can view all votes" ON votes FOR SELECT USING (true); 
CREATE POLICY "Users can create votes" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id); 
CREATE POLICY "Users can update own votes" ON votes FOR UPDATE USING (auth.uid() = user_id); 
CREATE POLICY "Users can delete own votes" ON votes FOR DELETE USING (auth.uid() = user_id); 

-- Step 4: Ensure RLS is enabled
ALTER TABLE polls ENABLE ROW LEVEL SECURITY; 
ALTER TABLE options ENABLE ROW LEVEL SECURITY; 
ALTER TABLE votes ENABLE ROW LEVEL SECURITY; 

-- Step 5: Grant permissions
GRANT ALL ON polls TO authenticated; 
GRANT ALL ON options TO authenticated; 
GRANT ALL ON votes TO authenticated; 
GRANT SELECT ON polls TO anon; 
GRANT SELECT ON options TO anon; 
GRANT SELECT ON votes TO anon;