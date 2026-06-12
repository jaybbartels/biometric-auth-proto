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
    const { userId, organizationId, configurationId, overallConfidence, decision, testResults, deviceInfo } = req.body;

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

    // Insert into authentication_events with full device info
    const { error: eventError } = await supabase
      .from('authentication_events')
      .insert({
        user_id: actualUserId,
        organization_id: organizationId,
        configuration_id: configurationId,
        overall_confidence: overallConfidence,
        decision: decision,
        test_results: { tests: testResults },
        device_info: {
          deviceType: deviceInfo?.deviceType || 'Unknown',
          browser: deviceInfo?.browser || 'Unknown',
          osVersion: deviceInfo?.osVersion || 'Unknown',
          latitude: deviceInfo?.latitude,
          longitude: deviceInfo?.longitude,
          accuracy: deviceInfo?.accuracy,
          userAgent: req.headers['user-agent']
        },
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
      });

    if (eventError) {
      console.error('Event insert error:', eventError);
      return res.status(400).json({ error: eventError.message });
    }

    // Upsert to trust_scores
    await supabase
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

    return res.status(200).json({ success: true, message: 'Results saved to database' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
