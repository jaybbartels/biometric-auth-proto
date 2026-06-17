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
      .select('id, overall_confidence, decision, created_at, configuration_name, device_info')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const formatted = (data || []).map((row: any) => ({
      id: row.id,
      confidence_score: row.overall_confidence,
      decision: row.decision,
      created_at: row.created_at,
      configuration_name: row.configuration_name,
      device_type: row.device_info?.type,
      app_version: row.device_info?.app_version
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
