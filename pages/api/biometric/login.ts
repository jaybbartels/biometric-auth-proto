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
    const { email, password, organization, configuration } = req.body;

    if (!email || !password || !organization || !configuration) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Find organization by name
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', organization)
      .single();

    if (orgError || !org) {
      return res.status(401).json({ error: 'Organization not found' });
    }

    // Find user by email in organization
    const { data: user, error: userError } = await supabase
      .from('org_users')
      .select('id, email, password_hash')
      .eq('organization_id', org.id)
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check password (in production, use bcrypt!)
    if (user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Get configuration details
    const { data: config, error: configError } = await supabase
      .from('configurations')
      .select('*')
      .eq('id', configuration)
      .eq('organization_id', org.id)
      .single();

    if (configError || !config) {
      return res.status(401).json({ error: 'Configuration not found' });
    }

    // Create session token
    const token = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        organizationId: org.id,
        configurationId: config.id,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
      })
    ).toString('base64');

    return res.status(200).json({
      token,
      userId: user.id,
      email: user.email,
      organizationId: org.id,
      organizationName: org.name,
      configurationId: config.id,
      configurationName: config.name
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
