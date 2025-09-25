import { createServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerClient();

        const { id: pollId } = await params;

        if (!pollId) {
            return NextResponse.json(
                { error: 'Poll ID is required' },
                { status: 400 }
            );
        }

        // Get the poll with options and vote counts
        const { data: poll, error: pollError } = await supabase
            .from('polls')
            .select(`
                id,
                title,
                description,
                is_active,
                created_at,
                updated_at,
                user_id,
                options (
                    id,
                    text,
                    created_at,
                    votes (
                        id,
                        user_id,
                        created_at
                    )
                )
            `)
            .eq('id', pollId)
            .single();

        if (pollError || !poll) {
            return NextResponse.json(
                { error: 'Poll not found' },
                { status: 404 }
            );
        }

        // Calculate total votes and format options with vote counts
        let totalVotes = 0;
        const formattedOptions = poll.options?.map((option: any) => {
            const voteCount = option.votes?.length || 0;
            totalVotes += voteCount;
            return {
                id: option.id,
                text: option.text,
                vote_count: voteCount,
                created_at: option.created_at,
            };
        }) || [];

        // Sort options by vote count (most popular first)
        formattedOptions.sort((a: any, b: any) => b.vote_count - a.vote_count);

        const formattedPoll = {
            id: poll.id,
            title: poll.title,
            description: poll.description,
            is_active: poll.is_active,
            created_at: poll.created_at,
            updated_at: poll.updated_at,
            total_votes: totalVotes,
            options: formattedOptions,
        };

        return NextResponse.json({
            poll: formattedPoll,
        });

    } catch (error) {
        console.error('Poll API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
