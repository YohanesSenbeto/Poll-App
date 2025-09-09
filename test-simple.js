import { getAllPolls } from './lib/database.js';

async function test() {
  console.log('Testing getAllPolls...');
  try {
    const polls = await getAllPolls();
    console.log('Success! Found', polls.length, 'polls');
    console.log('First poll:', polls[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();