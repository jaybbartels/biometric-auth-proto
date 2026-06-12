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
    const { userId, organizationId, configurationId, overallConfidence, decision } = req.body;

    console.log('Save request:', { userId, organizationId, configurationId });

    if (!userId || !organizationId || !configurationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Look up user UUID by email and organization
    const { data: userData, error: userError } = await supabase
      .from('org_users')
      .select('id')
      .eq('email', userId)
      .eq('organization_id', organizationId)
      .single();

    console.log('User lookup:', { userData, userError });

    if (userError || !userData) {
      return res.status(401).json({ error: 'User not found in organization' });
    }

    const actualUserId = userData.id;

    // Insert or update trust scores
    const { data: insertData, error: insertError } = await supabase
      .from('trust_scores')
      .insert({
        user_id: actualUserId,
        organization_id: organizationId,
        configuration_id: configurationId,
        confidence_score: overallConfidence,
        decision: decision,
        last_verified_at: new Date().toISOString()
      });

    console.log('Insert attempt:', { insertData, insertError });

    if (insertError) {
      console.error('Insert error:', insertError);

      if (insertError.code === '23505' || insertError.message.includes('unique')) {
        console.log('Updating existing record...');

        const { data: updateData, error: updateError } = await supabase
          .from('trust_scores')
          .update({
            confidence_score: overallConfidence,
            decision: decision,
            last_verified_at: new Date().toISOString()
          })
          .eq('user_id', actualUserId)
          .eq('organization_id', organizationId)
          .eq('configuration_id', configurationId);

        console.log('Update attempt:', { updateData, updateError });

        if (updateError) {
          console.error('Update error:', updateError);
          return res.status(400).json({ error: updateError.message });
        }

        return res.status(200).json({
          success: true,
          message: 'Results updated successfully'
        });
      }

      return res.status(400).json({ error: insertError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Results saved successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown'
    });
  }
}
