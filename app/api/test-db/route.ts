import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  
  try {
    // Test 1: Check polls table
    const { data: polls, error: pollsError } = await supabase
      .from('polls')
      .select('*')
      .limit(1)
    
    // Test 2: Check options table
    const { data: options, error: optionsError } = await supabase
      .from('options')
      .select('*')
      .limit(1)
    
    // Test 3: Check if we can get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('polls')
      .select('count()')
    
    const results = {
      connection: 'success',
      tables: {
        polls: {
          accessible: !pollsError,
          error: pollsError?.message,
          rowCount: polls?.length || 0
        },
        options: {
          accessible: !optionsError,
          error: optionsError?.message,
          rowCount: options?.length || 0
        }
      },
      totalPolls: tableInfo?.[0]?.count || 0,
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'
      }
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    return NextResponse.json({
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      tables: {}
    })
  }
}