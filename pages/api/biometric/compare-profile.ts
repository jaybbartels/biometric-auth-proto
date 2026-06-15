import { createClient } from '@supabase/supabase-js';
import { calculatePattern } from '@/lib/biometric-patterns';
import { comparePatterns, calculatePersonConfidence } from '@/lib/biometric-comparison';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, deviceType, sensorData, organizationId } = req.body;

    if (!email || !organizationId || !sensorData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Load training profile
    const { data: trainingProfile, error: profileError } = await supabase
      .from('biometric_training_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('device_type', deviceType)
      .eq('is_validated', true)
      .single();

    if (profileError || !trainingProfile) {
      return res.status(400).json({
        error: 'No validated training profile found for this email+phone combination',
        is_validated_user: false,
        person_confidence: 0
      });
    }

    // Calculate live patterns
    const liveGait = calculatePattern(sensorData.gait_analysis);
    const liveTouch = calculatePattern(sensorData.touch_dynamics);
    const liveHand = calculatePattern(sensorData.hand_motion);
    const liveBehavioral = calculatePattern(sensorData.behavioral_pattern);
    const liveFacial = calculatePattern(sensorData.facial_recognition);

    // Get trained patterns
    const trainedGait = trainingProfile.gait_analysis_data;
    const trainedTouch = trainingProfile.touch_dynamics_data;
    const trainedHand = trainingProfile.hand_motion_data;
    const trainedBehavioral = trainingProfile.behavioral_pattern_data;
    const trainedFacial = trainingProfile.facial_recognition_data;

    // Compare each biometric
    const gaitMatch = comparePatterns(liveGait, trainedGait);
    const touchMatch = comparePatterns(liveTouch, trainedTouch);
    const handMatch = comparePatterns(liveHand, trainedHand);
    const behavioralMatch = comparePatterns(liveBehavioral, trainedBehavioral);
    const facialMatch = comparePatterns(liveFacial, trainedFacial);

    // Calculate person confidence
    const personConfidence = calculatePersonConfidence(
      gaitMatch,
      touchMatch,
      handMatch,
      behavioralMatch,
      facialMatch,
      true // is_validated
    );

    // Try to get user ID (optional - user might not be in org_users)
    const { data: userData } = await supabase
      .from('org_users')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .single();

    const userId = userData?.id || null;

    // Log authentication event
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const deviceInfo = {
      type: deviceType,
      timestamp: new Date().toISOString(),
      user_agent: req.headers['user-agent']
    };

    const testResults = {
      gait_match: gaitMatch,
      touch_match: touchMatch,
      hand_match: handMatch,
      behavioral_match: behavioralMatch,
      facial_match: facialMatch,
      person_confidence: Math.round(personConfidence)
    };

    // Insert authentication event
    const { data: eventData, error: eventError } = await supabase
      .from('authentication_events')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        overall_confidence: Math.round(personConfidence),
        decision: personConfidence >= 70 ? 'allow' : 'deny',
        test_results: testResults,
        ip_address: String(ipAddress),
        device_info: deviceInfo,
        created_at: new Date().toISOString()
      })
      .select();

    if (eventError) {
      console.error('Failed to insert authentication_events:', eventError);
      throw eventError;
    }

    console.log('✅ Auth event logged:', eventData);

    return res.status(200).json({
      success: true,
      is_validated_user: true,
      gait_match: gaitMatch,
      touch_match: touchMatch,
      hand_match: handMatch,
      behavioral_match: behavioralMatch,
      facial_match: facialMatch,
      person_confidence: Math.round(personConfidence),
      training_profile_id: trainingProfile.id,
      event_logged: !!eventData
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' });
  }
}
