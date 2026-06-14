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
    const { email, deviceType, sensorData, locationHistory, enrollmentCode, appVersion } = req.body;

    const { data: inviteData, error: inviteError } = await supabase
      .from('enrollment_invites')
      .select('id, organization_id')
      .eq('enrollment_code', enrollmentCode)
      .eq('email', email)
      .eq('is_used', false)
      .single();

    if (inviteError || !inviteData) {
      return res.status(400).json({ error: 'Invalid or expired enrollment code' });
    }

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

    const { data, error } = await supabase
      .from('biometric_training_profiles')
      .insert({
        organization_id: inviteData.organization_id,
        email,
        device_type: deviceType,
        device_info: { type: deviceType, captured_at: new Date().toISOString(), app_version: appVersion },
        enrollment_code: enrollmentCode,
        location_history: locationHistory || [],
        gait_analysis_data: gaitPattern,
        touch_dynamics_data: touchPattern,
        hand_motion_data: handPattern,
        behavioral_pattern_data: behavioralPattern,
        facial_recognition_data: facialPattern,
        is_validated: true,
        training_sessions_count: 1
      });

    if (error) throw error;

    await supabase
      .from('enrollment_invites')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', inviteData.id);

    return res.status(200).json({
      success: true,
      message: 'Profile validated and saved',
      qualityScores: {
        gait: gaitPattern.quality_score,
        touch: touchPattern.quality_score
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
