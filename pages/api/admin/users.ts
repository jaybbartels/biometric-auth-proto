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
    const organizationId = req.query.organizationId || req.body.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId required' });
    }

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('org_users')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'email and password required' });
      }

      const { data, error } = await supabase
        .from('org_users')
        .insert({
          organization_id: organizationId,
          email,
          password_hash: password
        })
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(201).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
