import { createClient } from '@supabase/supabase-js';
import { calculatePattern } from '@/lib/biometric-patterns';
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

    // Calculate patterns from raw data
    const gaitPattern = calculatePattern(sensorData.gait_analysis);
    const touchPattern = calculatePattern(sensorData.touch_dynamics);
    const handPattern = calculatePattern(sensorData.hand_motion);
    const behavioralPattern = calculatePattern(sensorData.behavioral_pattern);
    const facialPattern = calculatePattern(sensorData.facial_recognition);

    // Check data quality
    const minQualityScore = Math.min(
      gaitPattern.quality_score,
      touchPattern.quality_score,
      handPattern.quality_score,
      behavioralPattern.quality_score,
      facialPattern.quality_score
    );

    if (minQualityScore < 50) {
      return res.status(400).json({
        error: 'Insufficient training data. Please collect more samples (need at least 50 per biometric type).',
        samplesCollected,
        qualityScore: minQualityScore
      });
    }

    // Insert training profile with PATTERNS (not raw data)
    const { data, error } = await supabase
      .from('biometric_training_profiles')
      .insert({
        organization_id: organizationId,
        email,
        device_type: deviceType,
        gait_analysis_data: gaitPattern,
        touch_dynamics_data: touchPattern,
        hand_motion_data: handPattern,
        behavioral_pattern_data: behavioralPattern,
        facial_recognition_data: facialPattern,
        training_sessions_count: 1
      });

    if (error) {
      console.error('Insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    console.log('Training profile saved with extracted patterns');

    return res.status(200).json({
      success: true,
      message: 'Training profile saved successfully',
      samplesCollected,
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
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
