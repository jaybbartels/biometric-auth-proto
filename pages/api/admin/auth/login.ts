import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, organization } = req.body;

    if (!username || !password || !organization) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find organization by name
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('name', organization)
      .single();

    if (orgError || !org) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Check username
    if (org.username !== username) {
      return res.status(401).json({ error: 'Invalid username' });
    }

    // Check password (in production, use bcrypt!)
    if (org.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Create session token (simple JWT-like)
    const token = Buffer.from(
      JSON.stringify({
        organizationId: org.id,
        organizationName: org.name,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
      })
    ).toString('base64');

    return res.status(200).json({
      token,
      organizationId: org.id,
      organizationName: org.name
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
