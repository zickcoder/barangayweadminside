export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: OPENROUTER_API_KEY is not configured in Vercel.' })
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://barangay178.gov.ph',
        'X-Title': 'Barangay 178 Emergency Portal',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal Server Error' })
  }
}
