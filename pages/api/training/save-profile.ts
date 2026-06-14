import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, deviceType, sessionData } = req.body;

    console.log('Saving training profile for:', email);

    // Get Demo Corp organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'Demo Corp')
      .single();

    if (orgError || !orgData) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const organizationId = orgData.id;

    // Insert training profile
    const { data, error } = await supabase
      .from('biometric_training_profiles')
      .insert({
        organization_id: organizationId,
        email,
        device_type: deviceType,
        gait_analysis_data: { score: sessionData.gait_analysis },
        touch_dynamics_data: { score: sessionData.touch_dynamics },
        hand_motion_data: { score: sessionData.hand_motion },
        behavioral_pattern_data: { score: sessionData.behavioral_pattern },
        facial_recognition_data: { score: sessionData.facial_recognition },
        training_sessions_count: 1
      });

    if (error) {
      console.error('Insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Training profile saved:', data);

    return res.status(200).json({
      success: true,
      message: 'Training profile saved successfully',
      data
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
