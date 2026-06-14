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
    const { email, deviceInfo, sessionData, locations } = req.body;

    if (!email || !deviceInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For now, use a default organization (Demo Corp)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'Demo Corp')
      .single();

    if (!orgData) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const organizationId = orgData.id;

    // Upsert training profile
    const { data, error } = await supabase
      .from('biometric_training_profiles')
      .upsert({
        organization_id: organizationId,
        email,
        device_id: deviceInfo.deviceId,
        device_type: deviceInfo.deviceType,
        device_info: deviceInfo,
        gait_analysis_data: { score: sessionData.gait_analysis, samples: sessionData.samples_collected },
        touch_dynamics_data: { score: sessionData.touch_dynamics, samples: sessionData.samples_collected },
        hand_motion_data: { score: sessionData.hand_motion, samples: sessionData.samples_collected },
        behavioral_pattern_data: { score: sessionData.behavioral_pattern, samples: sessionData.samples_collected },
        facial_recognition_data: { score: sessionData.facial_recognition, samples: sessionData.samples_collected },
        location_history: locations,
        training_sessions_count: 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,email,device_id'
      });

    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }

    console.log('Training profile saved:', data);

    return res.status(200).json({
      success: true,
      message: 'Training profile saved successfully',
      profile: data
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
