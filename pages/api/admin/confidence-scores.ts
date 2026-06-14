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
      return res.status(400).json({ error: 'organizationId required' });
    }

    // Get all authentication events for this organization
    const { data: events, error } = await supabase
      .from('authentication_events')
      .select(`
        id,
        user_id,
        organization_id,
        overall_confidence,
        decision,
        created_at,
        test_results
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Get user emails
    const { data: users } = await supabase
      .from('org_users')
      .select('id, email')
      .eq('organization_id', organizationId);

    const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

    // Format for display
    const formattedScores = events?.map((e: any) => ({
      id: e.id,
      user_id: e.user_id,
      email: userMap.get(e.user_id) || 'Unknown',
      confidence_score: e.overall_confidence,
      decision: e.decision,
      created_at: e.created_at,
      test_results: e.test_results
    })) || [];

    return res.status(200).json(formattedScores);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
