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
        .from('configurations')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const {
        name,
        description,
        included_modules,
        allow_threshold,
        challenge_threshold,
        deny_threshold,
        allow_redirect_url,
        challenge_redirect_url,
        deny_redirect_url
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name required' });
      }

      const { data, error } = await supabase
        .from('configurations')
        .insert({
          organization_id: organizationId,
          name,
          description: description || '',
          included_modules: included_modules || [],
          allow_threshold: allow_threshold || 80,
          challenge_threshold: challenge_threshold || 70,
          deny_threshold: deny_threshold || 50,
          allow_redirect_url: allow_redirect_url || '',
          challenge_redirect_url: challenge_redirect_url || '',
          deny_redirect_url: deny_redirect_url || ''
        })
        .select();

      if (error) {
        console.error('Insert error:', error);
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
