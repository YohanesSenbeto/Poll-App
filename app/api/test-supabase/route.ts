import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('=== TESTING SUPABASE CONNECTION ===');

    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('polls')
      .select('id')
      .limit(1);

    console.log('Supabase connection test:', {
      success: !testError,
      error: testError?.message,
      dataCount: testData?.length
    });

    if (testError) {
      return NextResponse.json({
        status: 'ERROR',
        message: 'Supabase connection failed',
        error: testError.message,
        details: testError
      });
    }

    // Test comments table
    const { data: commentsData, error: commentsError } = await supabase
      .from('"comments"')
      .select('*')
      .limit(1);

    console.log('Comments table test:', {
      success: !commentsError,
      error: commentsError?.message,
      dataCount: commentsData?.length
    });

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Supabase connection working',
      polls: {
        accessible: !testError,
        error: testError?.message
      },
      comments: {
        accessible: !commentsError,
        error: commentsError?.message,
        tableExists: !commentsError || !commentsError.message?.includes('does not exist')
      }
    });

  } catch (error) {
    console.error('=== SUPABASE TEST FAILED ===', error);
    return NextResponse.json({
      status: 'ERROR',
      message: 'Test failed',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

