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
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId required' });
    }

    // Get all authentication events with user details
    const { data, error } = await supabase
      .from('authentication_events')
      .select(`
        id,
        user_id,
        organization_id,
        configuration_id,
        overall_confidence,
        decision,
        created_at,
        configurations:configuration_id (
          id,
          name
        ),
        org_users:user_id (
          id,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform data to flatten relationships
    const transformedData = data?.map((record: any) => ({
      id: record.id,
      user_id: record.user_id,
      email: record.org_users?.email || 'Unknown',
      organization_id: record.organization_id,
      configuration_id: record.configuration_id,
      configuration_name: record.configurations?.name || 'Unknown',
      confidence_score: record.overall_confidence,
      decision: record.decision,
      created_at: record.created_at
    })) || [];

    return res.status(200).json(transformedData);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
