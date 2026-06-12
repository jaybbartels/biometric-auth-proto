import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }

    // Find organizations where this user exists
    const { data: users, error: userError } = await supabase
      .from('org_users')
      .select('organization_id')
      .eq('email', email);

    if (userError) throw userError;

    if (!users || users.length === 0) {
      return res.status(200).json([]);
    }

    const orgIds = users.map(u => u.organization_id);

    // Get organization details
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds);

    if (orgError) throw orgError;

    return res.status(200).json(orgs || []);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
