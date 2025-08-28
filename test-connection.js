// Simple database connection test using fetch
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...')
  
  // Read environment variables manually
  const fs = require('fs')
  let envContent = ''
  try {
    envContent = fs.readFileSync('.env.local', 'utf8')
  } catch {
    try {
      envContent = fs.readFileSync('.env', 'utf8')
    } catch {
      console.error('❌ No .env.local or .env file found')
      return
    }
  }
  
  const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)
  const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)
  
  if (!urlMatch || !keyMatch) {
    console.error('❌ Missing environment variables in .env file')
    return
  }
  
  const supabaseUrl = urlMatch[1].trim()
  const supabaseKey = keyMatch[1].trim()
  
  console.log('📡 Testing connection to:', supabaseUrl)

  // Test direct REST API call
  try {
    console.log('📡 Testing REST API connection...')
    
    const response = await fetch(`${supabaseUrl}/rest/v1/polls?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Database connection successful!')
      console.log('   Found polls table,', data.length, 'rows')
    } else {
      const error = await response.json()
      console.error('❌ Database connection failed:', error.message)
      console.error('   Code:', error.code)
    }
    
    // Test options table
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/options?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (optionsResponse.ok) {
      console.log('✅ Options table accessible')
    } else {
      console.error('❌ Options table not accessible')
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message)
  }
  
  console.log('\n🎉 Database connection test completed!')
}

testDatabaseConnection()