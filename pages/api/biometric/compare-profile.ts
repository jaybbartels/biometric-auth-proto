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

  let deviceType = '';
  let email = '';
  let organizationId = '';

  try {
    const { email: emailInput, deviceType: deviceTypeInput, sensorData, organizationId: orgId, configurationId } = req.body;

    deviceType = (deviceTypeInput || '').toLowerCase();
    email = emailInput || '';
    organizationId = orgId || '';

    console.log('=== COMPARE PROFILE START ===');
    console.log('Input:', { email, deviceType, organizationId });

    if (!email || !organizationId || !sensorData) {
      console.log('Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Load training profile
    console.log('Step 1: Fetching training profile...');
    const { data: trainingProfile, error: profileError } = await supabase
      .from('biometric_training_profiles')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('device_type', deviceType)
      .eq('is_validated', true)
      .single();

    if (profileError) {
      console.log('Profile query error:', profileError);
    }

    if (!trainingProfile) {
      console.log('No training profile found');
      return res.status(400).json({
        error: 'No validated training profile found',
        is_validated_user: false,
        person_confidence: 0
      });
    }

    console.log('Step 2: Training profile found, checking age...');
    const trainingDate = new Date(trainingProfile.created_at);
    const daysOld = Math.floor((Date.now() - trainingDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOld > 30) {
      return res.status(400).json({
        error: `Training data is ${daysOld} days old`,
        is_validated_user: false,
        person_confidence: 0
      });
    }

    console.log('Step 3: Getting configuration modules...');
    let includedModules = ['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern'];
    if (configurationId) {
      const { data: config, error: configError } = await supabase
        .from('configurations')
        .select('included_modules')
        .eq('id', configurationId)
        .single();
      
      if (configError) {
        console.log('Config error:', configError);
      } else if (config?.included_modules) {
        includedModules = config.included_modules;
      }
    }

    console.log('Step 4: Calculating patterns...');
    const liveGait = includedModules.includes('gait_analysis') ? calculatePattern(sensorData.gait_analysis) : null;
    const liveTouch = includedModules.includes('touch_dynamics') ? calculatePattern(sensorData.touch_dynamics) : null;
    const liveHand = includedModules.includes('hand_motion') ? calculatePattern(sensorData.hand_motion) : null;
    const liveBehavioral = includedModules.includes('behavioral_pattern') ? calculatePattern(sensorData.behavioral_pattern) : null;
    const liveFacial = includedModules.includes('facial_recognition') ? calculatePattern(sensorData.facial_recognition) : null;

    const trainedGait = trainingProfile.gait_analysis_data;
    const trainedTouch = trainingProfile.touch_dynamics_data;
    const trainedHand = trainingProfile.hand_motion_data;
    const trainedBehavioral = trainingProfile.behavioral_pattern_data;
    const trainedFacial = trainingProfile.facial_recognition_data;

    console.log('Step 5: Comparing patterns...');
    const matches: { [key: string]: number } = {};
    
    if (liveGait && trainedGait) matches.gait = comparePatterns(liveGait, trainedGait);
    if (liveTouch && trainedTouch) matches.touch = comparePatterns(liveTouch, trainedTouch);
    if (liveHand && trainedHand) matches.hand = comparePatterns(liveHand, trainedHand);
    if (liveBehavioral && trainedBehavioral) matches.behavioral = comparePatterns(liveBehavioral, trainedBehavioral);
    if (liveFacial && trainedFacial) matches.facial = comparePatterns(liveFacial, trainedFacial);

    const enabledCount = Object.keys(matches).length;
    if (enabledCount === 0) {
      return res.status(400).json({ error: 'No biometrics to compare' });
    }

    const personConfidence = Math.round(Object.values(matches).reduce((a, b) => a + b, 0) / enabledCount);

    console.log('Step 6: Looking up user...');
    const { data: userData, error: userError } = await supabase
      .from('org_users')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.log('User lookup error:', userError);
    }

    const userId = userData?.id || null;

    console.log('Step 7: Inserting auth event...');
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
      console.error('Insert error:', eventError);
      throw new Error(`DB Insert failed: ${eventError.message}`);
    }

    console.log('✅ Success');

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
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }

    console.error('❌ CAUGHT ERROR:', errorMessage);
    
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: errorMessage,
      step: `Processing ${email} on ${deviceType}`
    });
  }
}
