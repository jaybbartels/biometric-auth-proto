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
    const { email, deviceType, sensorData, samplesCollected } = req.body;

    console.log('Saving training profile for:', email, 'with', samplesCollected, 'samples');

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

    // Insert training profile with RAW sensor data arrays
    const { data, error } = await supabase
      .from('biometric_training_profiles')
      .insert({
        organization_id: organizationId,
        email,
        device_type: deviceType,
        gait_analysis_data: {
          raw_samples: sensorData.gait_analysis,
          sample_count: sensorData.gait_analysis.length,
          average: sensorData.gait_analysis.reduce((a: number, b: number) => a + b, 0) / sensorData.gait_analysis.length
        },
        touch_dynamics_data: {
          raw_samples: sensorData.touch_dynamics,
          sample_count: sensorData.touch_dynamics.length,
          average: sensorData.touch_dynamics.reduce((a: number, b: number) => a + b, 0) / sensorData.touch_dynamics.length
        },
        hand_motion_data: {
          raw_samples: sensorData.hand_motion,
          sample_count: sensorData.hand_motion.length,
          average: sensorData.hand_motion.reduce((a: number, b: number) => a + b, 0) / sensorData.hand_motion.length
        },
        behavioral_pattern_data: {
          raw_samples: sensorData.behavioral_pattern,
          sample_count: sensorData.behavioral_pattern.length,
          average: sensorData.behavioral_pattern.reduce((a: number, b: number) => a + b, 0) / sensorData.behavioral_pattern.length
        },
        facial_recognition_data: {
          raw_samples: sensorData.facial_recognition,
          sample_count: sensorData.facial_recognition.length,
          average: sensorData.facial_recognition.reduce((a: number, b: number) => a + b, 0) / sensorData.facial_recognition.length
        },
        training_sessions_count: 1
      });

    if (error) {
      console.error('Insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Training profile saved successfully');

    return res.status(200).json({
      success: true,
      message: 'Training profile saved with raw sensor data',
      samplesCollected
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
