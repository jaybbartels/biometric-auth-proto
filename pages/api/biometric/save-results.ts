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
    const { userId, organizationId, configurationId, overallConfidence, decision, testResults } = req.body;

    console.log('=== SAVE RESULTS ===');
    console.log('userId:', userId);
    console.log('organizationId:', organizationId);

    if (!userId || !organizationId || !configurationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Look up user UUID
    const { data: userData, error: userError } = await supabase
      .from('org_users')
      .select('id')
      .eq('email', userId)
      .eq('organization_id', organizationId)
      .single();

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found in organization' });
    }

    const actualUserId = userData.id;
    console.log('actualUserId:', actualUserId);

    // Insert into authentication_events (for admin dashboard)
    const { error: eventError } = await supabase
      .from('authentication_events')
      .insert({
        user_id: actualUserId,
        organization_id: organizationId,
        configuration_id: configurationId,
        overall_confidence: overallConfidence,
        decision: decision,
        test_results: { tests: testResults },
        device_info: { userAgent: req.headers['user-agent'] },
        ip_address: req.headers['x-forwarded-for'] || 'unknown'
      });

    console.log('Event insert:', eventError);

    // Upsert to trust_scores
    const { error: trustError } = await supabase
      .from('trust_scores')
      .upsert({
        user_id: actualUserId,
        organization_id: organizationId,
        configuration_id: configurationId,
        confidence_score: overallConfidence,
        decision: decision,
        last_verified_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id,configuration_id'
      });

    console.log('Trust score upsert:', trustError);

    return res.status(200).json({ success: true, message: 'Results saved to database' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
