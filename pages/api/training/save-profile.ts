import { createClient } from '@supabase/supabase-js';
import { calculatePattern, isGoodQualityProfile } from '@/lib/biometric-patterns';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, deviceType, sensorData, locationHistory } = req.body;

    const gaitPattern = calculatePattern(sensorData.gait_analysis);
    const touchPattern = calculatePattern(sensorData.touch_dynamics);
    const handPattern = calculatePattern(sensorData.hand_motion);
    const behavioralPattern = calculatePattern(sensorData.behavioral_pattern);
    const facialPattern = calculatePattern(sensorData.facial_recognition);

    if (!isGoodQualityProfile(gaitPattern) || !isGoodQualityProfile(touchPattern) || 
        !isGoodQualityProfile(handPattern) || !isGoodQualityProfile(behavioralPattern) || 
        !isGoodQualityProfile(facialPattern)) {
      return res.status(400).json({ error: 'Need 100+ samples. Collect more data.' });
    }

    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', 'Demo Corp')
      .single();

    if (!orgData) return res.status(400).json({ error: 'Organization not found' });

    const { data, error } = await supabase
      .from('biometric_training_profiles')
      .insert({
        organization_id: orgData.id,
        email,
        device_type: deviceType,
        device_info: { type: deviceType, captured_at: new Date().toISOString() },
        location_history: locationHistory || [],
        gait_analysis_data: gaitPattern,
        touch_dynamics_data: touchPattern,
        hand_motion_data: handPattern,
        behavioral_pattern_data: behavioralPattern,
        facial_recognition_data: facialPattern,
        training_sessions_count: 1
      });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'Profile saved with patterns and location history',
      qualityScores: {
        gait: gaitPattern.quality_score,
        touch: touchPattern.quality_score,
        hand: handPattern.quality_score,
        behavioral: behavioralPattern.quality_score,
        facial: facialPattern.quality_score
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
