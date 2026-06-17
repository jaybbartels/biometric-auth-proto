import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    const { data, error } = await supabase
      .from('authentication_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Query error:', error);
      throw error;
    }

    // For each record, look up email if user_id exists
    const enriched = await Promise.all((data || []).map(async (row: any) => {
      let email = 'N/A';
      
      if (row.user_id) {
        const { data: userData } = await supabase
          .from('org_users')
          .select('email')
          .eq('id', row.user_id)
          .single();
        
        if (userData?.email) {
          email = userData.email;
        }
      }
      
      return {
        ...row,
        email: email
      };
    }));

    return res.status(200).json(enriched);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
