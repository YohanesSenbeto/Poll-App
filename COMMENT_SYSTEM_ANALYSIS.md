# COMMENT SYSTEM ANALYSIS REPORT

## 🔍 **Data Flow Analysis**

### **1. Comment Data Sources**
The comment data comes from these sources:

#### **Primary Source: Database Tables**
- **`public.comments`** - Main comments table
- **`public.comment_votes`** - Comment voting data  
- **`public.user_profiles`** - User profile information
- **`auth.users`** - Supabase authentication users

#### **API Endpoints**
- **`/api/comments`** (GET) - Fetches comments for a poll
- **`/api/comments`** (POST) - Creates new comments
- **`/api/comments/[id]/vote`** - Handles comment voting
- **`/api/comments/[id]`** (PUT/DELETE) - Edit/delete comments

#### **Frontend Components**
- **`CommentList`** - Displays list of comments
- **`CommentItem`** - Individual comment display
- **`CommentForm`** - Form for posting comments

### **2. Data Flow Process**

```
1. User visits page → CommentList component loads
2. CommentList calls /api/comments?pollId=xxx
3. API queries database: comments + user_profiles
4. API returns comments with author data
5. CommentList displays comments with usernames
6. User posts comment → CommentForm submits to API
7. API saves to database → Returns new comment
8. CommentList refreshes to show new comment
```

### **3. Current Issues Identified**

#### **Issue 1: Seeded Data Persistence**
- **Problem**: Old seeded comments still showing "User c15178dc"
- **Cause**: Previous SQL cleanup scripts didn't remove all seeded data
- **Location**: Database table `public.comments`
- **Solution**: Run comprehensive cleanup script

#### **Issue 2: Username Display Logic**
- **Problem**: Comments showing "User c15178dc" instead of proper names
- **Cause**: Missing or incorrect user profile data
- **Location**: API `/api/comments` GET endpoint
- **Solution**: Ensure user_profiles data is properly fetched

#### **Issue 3: RLS Policy Issues**
- **Problem**: Potential permission issues affecting data access
- **Cause**: RLS policies might be too restrictive or permissive
- **Location**: Database RLS policies
- **Solution**: Review and fix RLS policies

### **4. Data Sources by Component**

#### **Home Page (`app/page.tsx`)**
- **CommentList** with `pollId="724a499d-dd5d-4758-af5f-47d771f242a9"`
- **Data Source**: Database via `/api/comments` API
- **Issue**: Shows seeded data from database

#### **Individual Poll Page (`app/polls/[id]/page.tsx`)**
- **CommentList** with dynamic `pollId` from URL
- **Data Source**: Database via `/api/comments` API
- **Issue**: Same seeded data issue

#### **CommentList Component (`components/comment-list.tsx`)**
- **Fetches**: `/api/comments?pollId=xxx`
- **Displays**: Comments with author information
- **Issue**: Receives seeded data from API

### **5. Database Schema Analysis**

#### **Comments Table Structure**
```sql
CREATE TABLE public.comments (
    id UUID PRIMARY KEY,
    poll_id UUID REFERENCES polls(id),
    user_id UUID REFERENCES auth.users(id),
    parent_id UUID REFERENCES comments(id),
    content TEXT,
    is_edited BOOLEAN,
    is_deleted BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

#### **User Profiles Table Structure**
```sql
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    username TEXT,
    avatar_url TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### **6. RLS Policies Analysis**

#### **Current Policies**
- **Comments SELECT**: `is_deleted = FALSE` (anyone can view non-deleted)
- **Comments INSERT**: `auth.uid() = user_id` (users can create own comments)
- **Comments UPDATE**: `auth.uid() = user_id` (users can update own)
- **Comments DELETE**: `auth.uid() = user_id` (users can delete own)

#### **Potential Issues**
- **Guest users**: Policies require `auth.uid()` but guests don't have auth
- **Public access**: Some policies might be too restrictive
- **Cross-user access**: Users might not see other users' profiles

### **7. Recommended Solutions**

#### **Immediate Fixes**
1. **Run cleanup script**: `scripts/remove-all-seeded-data.sql`
2. **Check RLS policies**: `scripts/check-rls-policies.sql`
3. **Verify user profiles**: Ensure all comment authors have profiles

#### **Long-term Improvements**
1. **Universal access policies**: Allow public to view comments
2. **Guest user support**: Handle anonymous commenting properly
3. **Profile creation**: Auto-create profiles for comment authors
4. **Data validation**: Ensure data integrity

### **8. Testing Checklist**

- [ ] Run comprehensive analysis script
- [ ] Check RLS policies status
- [ ] Verify comment data sources
- [ ] Test comment posting
- [ ] Test username display
- [ ] Test edit/delete functionality
- [ ] Test guest commenting
- [ ] Test authenticated user commenting

## 🎯 **Next Steps**

1. **Run Analysis Scripts**: Execute both analysis scripts
2. **Review Results**: Check what data is actually in the database
3. **Clean Up Data**: Remove seeded data if found
4. **Fix Policies**: Update RLS policies if needed
5. **Test System**: Verify all functionality works

