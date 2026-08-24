export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST')
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

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const { email, password } = payload || {}

    if (!email || !password) {
      return res.status(400).json({ valid: false, error: 'Email and password are required.' })
    }

    const cleanInputEmail = email.trim().toLowerCase()
    const cleanInputPassword = password.trim()

    // Configurable Admin credentials from Server Environment Variables
    const serverAdminEmail = (process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || 'admin@barangay178.gov.ph').trim().toLowerCase()
    const serverAdminPassword = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'admin123!'

    // Optional secondary allowed email for testing
    const fallbackEmail = (process.env.TEST_ADMIN_EMAIL || 'thacoj@gmail.com').trim().toLowerCase()

    const isEmailValid = cleanInputEmail === serverAdminEmail || cleanInputEmail === fallbackEmail
    const isPasswordValid = cleanInputPassword === serverAdminPassword

    if (isEmailValid && isPasswordValid) {
      return res.status(200).json({
        valid: true,
        email: cleanInputEmail,
      })
    }

    return res.status(401).json({
      valid: false,
      error: 'Invalid email or password.',
    })
  } catch (error) {
    return res.status(500).json({ valid: false, error: error.message || 'Authentication error' })
  }
}
