import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: commentId } = await params;
    const { voteType } = await request.json();

    if (!commentId || voteType === undefined || ![1, -1].includes(voteType)) {
      return NextResponse.json({ error: 'Comment ID and valid vote type are required' }, { status: 400 });
    }

    // For now, return a mock response to avoid Supabase issues
    const mockResponse = {
      success: true,
      action: 'created',
      message: 'Vote recorded (mock)',
      voteType: voteType,
      commentId: commentId
    };

    console.log('Vote API: Returning mock response:', mockResponse);
    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error('Vote API: Exception:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}