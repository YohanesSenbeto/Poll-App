import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerComponentClient({ cookies: () => cookieStore });

        // Get the authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const { pollId, optionText } = await request.json();

        if (!pollId || !optionText) {
            return NextResponse.json(
                { error: 'Poll ID and option text are required' },
                { status: 400 }
            );
        }

        // First, get the poll to make sure it exists and is active
        const { data: poll, error: pollError } = await supabase
            .from('polls')
            .select('*')
            .eq('id', pollId)
            .eq('is_active', true)
            .single();

        if (pollError || !poll) {
            // For programming language polls, we might need to create the poll if it doesn't exist
            if (pollId === '950cd588-0ffc-4cdb-8fdf-039318533ada') {
                // Create the programming languages poll if it doesn't exist
                const { data: newPoll, error: createPollError } = await supabase
                    .from('polls')
                    .insert({
                        id: pollId,
                        title: 'Programming Language Popularity',
                        description: 'Vote for your favorite programming language',
                        user_id: user.id,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                if (createPollError) {
                    return NextResponse.json(
                        { error: 'Failed to create programming language poll' },
                        { status: 500 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Poll not found or inactive' },
                    { status: 404 }
                );
            }
        }

        // Find or create the option for this programming language
        const { data: existingOption, error: optionError } = await supabase
            .from('options')
            .select('*')
            .eq('poll_id', pollId)
            .eq('text', optionText)
            .single();

        let optionId: string;

        if (optionError && optionError.code === 'PGRST116') {
            // Option doesn't exist, create it
            const { data: newOption, error: createError } = await supabase
                .from('options')
                .insert({
                    poll_id: pollId,
                    text: optionText,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (createError) {
                return NextResponse.json(
                    { error: 'Failed to create option' },
                    { status: 500 }
                );
            }

            optionId = newOption.id;
        } else if (existingOption) {
            optionId = existingOption.id;
        } else {
            return NextResponse.json(
                { error: 'Failed to find or create option' },
                { status: 500 }
            );
        }

        // Check if user already voted on this poll
        const { data: existingVote, error: voteCheckError } = await supabase
            .from('votes')
            .select('*')
            .eq('poll_id', pollId)
            .eq('user_id', user.id)
            .single();

        if (existingVote) {
            // Update existing vote
            const { error: updateError } = await supabase
                .from('votes')
                .update({ option_id: optionId })
                .eq('id', existingVote.id);

            if (updateError) {
                return NextResponse.json(
                    { error: 'Failed to update vote' },
                    { status: 500 }
                );
            }
        } else {
            // Create new vote
            const { error: voteError } = await supabase
                .from('votes')
                .insert({
                    poll_id: pollId,
                    option_id: optionId,
                    user_id: user.id,
                    created_at: new Date().toISOString(),
                });

            if (voteError) {
                return NextResponse.json(
                    { error: 'Failed to submit vote' },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Vote submitted successfully',
            option: optionText,
        });

    } catch (error) {
        console.error('Vote API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
