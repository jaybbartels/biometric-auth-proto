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
    const { email, deviceType, sensorData, organizationId, configurationId } = req.body;

    console.log('=== COMPARE PROFILE DEBUG ===');
    console.log('Searching for:', { email, deviceType, organizationId });

    if (!email || !organizationId || !sensorData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, let's see all training profiles for this org
    const { data: allProfiles } = await supabase
      .from('biometric_training_profiles')
      .select('email, device_type, is_validated, organization_id')
      .eq('organization_id', organizationId);

    console.log('All profiles in org:', allProfiles);

    // Load training profile
    const { data: trainingProfile, error: profileError } = await supabase
      .from('biometric_training_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('device_type', deviceType)
      .eq('is_validated', true)
      .single();

    console.log('Query result:', { trainingProfile, profileError });

    if (profileError || !trainingProfile) {
      console.log('Profile not found. Looking for alternatives...');
      
      // Check if profile exists but is_validated is false
      const { data: unvalidated } = await supabase
        .from('biometric_training_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .eq('device_type', deviceType);
      
      console.log('Unvalidated profile:', unvalidated);

      return res.status(400).json({
        error: 'No validated training profile found for this email+phone combination',
        is_validated_user: false,
        person_confidence: 0,
        debug: {
          searched_for: { email, deviceType, organizationId },
          available_profiles: allProfiles,
          unvalidated_matches: unvalidated
        }
      });
    }

    // Check if training is older than 30 days
    const trainingDate = new Date(trainingProfile.created_at);
    const daysOld = Math.floor((Date.now() - trainingDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld > 30) {
      return res.status(400).json({
        error: `Training data is ${daysOld} days old. Please retrain (30-day limit).`,
        is_validated_user: false,
        person_confidence: 0,
        days_old: daysOld
      });
    }

    // Get configuration to see which biometrics to use
    let includedModules = ['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern'];
    if (configurationId) {
      const { data: config } = await supabase
        .from('configurations')
        .select('included_modules')
        .eq('id', configurationId)
        .single();
      if (config?.included_modules) {
        includedModules = config.included_modules;
      }
    }

    // Calculate live patterns
    const liveGait = includedModules.includes('gait_analysis') ? calculatePattern(sensorData.gait_analysis) : null;
    const liveTouch = includedModules.includes('touch_dynamics') ? calculatePattern(sensorData.touch_dynamics) : null;
    const liveHand = includedModules.includes('hand_motion') ? calculatePattern(sensorData.hand_motion) : null;
    const liveBehavioral = includedModules.includes('behavioral_pattern') ? calculatePattern(sensorData.behavioral_pattern) : null;
    const liveFacial = includedModules.includes('facial_recognition') ? calculatePattern(sensorData.facial_recognition) : null;

    // Get trained patterns
    const trainedGait = trainingProfile.gait_analysis_data;
    const trainedTouch = trainingProfile.touch_dynamics_data;
    const trainedHand = trainingProfile.hand_motion_data;
    const trainedBehavioral = trainingProfile.behavioral_pattern_data;
    const trainedFacial = trainingProfile.facial_recognition_data;

    // Compare only enabled biometrics
    const matches: { [key: string]: number } = {};
    
    if (liveGait && trainedGait) matches.gait = comparePatterns(liveGait, trainedGait);
    if (liveTouch && trainedTouch) matches.touch = comparePatterns(liveTouch, trainedTouch);
    if (liveHand && trainedHand) matches.hand = comparePatterns(liveHand, trainedHand);
    if (liveBehavioral && trainedBehavioral) matches.behavioral = comparePatterns(liveBehavioral, trainedBehavioral);
    if (liveFacial && trainedFacial) matches.facial = comparePatterns(liveFacial, trainedFacial);

    const enabledCount = Object.keys(matches).length;
    if (enabledCount === 0) {
      return res.status(400).json({ error: 'No biometrics enabled for comparison' });
    }

    const personConfidence = Math.round(Object.values(matches).reduce((a, b) => a + b, 0) / enabledCount);

    // Try to get user ID (optional)
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
      user_agent: req.headers['user-agent'],
      training_age_days: daysOld
    };

    const testResults = {
      ...matches,
      person_confidence: personConfidence,
      tests_used: Object.keys(matches)
    };

    const { data: eventData, error: eventError } = await supabase
      .from('authentication_events')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        overall_confidence: personConfidence,
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
      person_confidence: personConfidence,
      training_age_days: daysOld,
      biometrics_used: Object.keys(matches),
      training_profile_id: trainingProfile.id,
      event_logged: !!eventData
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' });
  }
}
