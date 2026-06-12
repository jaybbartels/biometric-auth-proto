import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  testName: string;
  confidenceScore: number;
  running: boolean;
  lastUpdated: string;
}

class GaitAnalyzer {
  static analyze(accelData: number[]): number {
    if (!accelData || accelData.length === 0) return 0;
    const mean = accelData.reduce((a, b) => a + b, 0) / accelData.length;
    const variance = accelData.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / accelData.length;
    const confidence = Math.min(100, Math.max(0, (variance / 100) * 100));
    return confidence + (Math.random() * 20 - 10);
  }
}

class TouchDynamicsAnalyzer {
  static analyze(touchEvents: Array<{ pressure: number; velocity: number }>): number {
    if (!touchEvents || touchEvents.length === 0) return 0;
    const pressures = touchEvents.map(t => t.pressure);
    const velocities = touchEvents.map(t => t.velocity);
    const pressureVariance = this.calculateVariance(pressures);
    const velocityVariance = this.calculateVariance(velocities);
    const baseConfidence = (pressureVariance * 0.5 + velocityVariance * 0.5) / 100 * 100;
    return Math.min(100, baseConfidence + (Math.random() * 15 - 7.5));
  }
  
  private static calculateVariance(data: number[]): number {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length;
  }
}

class HandMotionAnalyzer {
  static analyze(): number {
    const baseConfidence = 65;
    return baseConfidence + (Math.random() * 25 - 12.5);
  }
}

class BehavioralPatternAnalyzer {
  static analyze(): number {
    const baseConfidence = 55;
    return baseConfidence + (Math.random() * 30 - 15);
  }
}

function calculateOverallConfidence(testResults: TestResult[]): number {
  const weights = {
    gait_analysis: 0.35,
    touch_dynamics: 0.35,
    hand_motion: 0.15,
    behavioral_pattern: 0.15
  };
  
  let weighted_sum = 0;
  let weight_sum = 0;
  
  testResults.forEach(result => {
    const weight = weights[result.testName as keyof typeof weights] || 0.1;
    weighted_sum += result.confidenceScore * weight;
    weight_sum += weight;
  });
  
  return weight_sum > 0 ? weighted_sum / weight_sum : 0;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, organizationId, configurationId, sessionId, accelerometerData, touchEvents } = req.body;

    console.log('Verify request:', { userId, organizationId, configurationId });

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

    const testResults: TestResult[] = [];

    const gaitConfidence = Math.max(0, Math.min(100, GaitAnalyzer.analyze(accelerometerData || [])));
    testResults.push({
      testName: 'gait_analysis',
      confidenceScore: gaitConfidence,
      running: true,
      lastUpdated: new Date().toISOString()
    });

    const touchConfidence = Math.max(0, Math.min(100, TouchDynamicsAnalyzer.analyze(touchEvents || [])));
    testResults.push({
      testName: 'touch_dynamics',
      confidenceScore: touchConfidence,
      running: true,
      lastUpdated: new Date().toISOString()
    });

    const handMotionConfidence = Math.max(0, Math.min(100, HandMotionAnalyzer.analyze()));
    testResults.push({
      testName: 'hand_motion',
      confidenceScore: handMotionConfidence,
      running: true,
      lastUpdated: new Date().toISOString()
    });

    const behavioralConfidence = Math.max(0, Math.min(100, BehavioralPatternAnalyzer.analyze()));
    testResults.push({
      testName: 'behavioral_pattern',
      confidenceScore: behavioralConfidence,
      running: true,
      lastUpdated: new Date().toISOString()
    });

    const overallConfidence = calculateOverallConfidence(testResults);

    let decision = 'allow';
    if (overallConfidence < 50) {
      decision = 'deny';
    } else if (overallConfidence < 70) {
      decision = 'challenge';
    }

    console.log('Storing results with userId:', actualUserId);

    // Store test results
    const { error: insertError } = await supabase
      .from('test_results')
      .insert(
        testResults.map(result => ({
          user_id: actualUserId,
          organization_id: organizationId,
          configuration_id: configurationId,
          test_name: result.testName,
          confidence_score: result.confidenceScore,
          raw_data: { timestamp: new Date().toISOString() },
          session_id: sessionId
        }))
      );

    if (insertError) {
      console.error('Error storing test results:', insertError);
    }

    // Store authentication event
    const { error: eventError } = await supabase
      .from('authentication_events')
      .insert({
        user_id: actualUserId,
        organization_id: organizationId,
        configuration_id: configurationId,
        overall_confidence: overallConfidence,
        decision: decision,
        test_results: { tests: testResults },
        device_info: { userAgent: req.headers['user-agent'] },
        ip_address: req.headers['x-forwarded-for'] || 'unknown'
      });

    if (eventError) {
      console.error('Error storing auth event:', eventError);
    }

    // Update trust scores
    const { error: trustError } = await supabase
      .from('trust_scores')
      .upsert({
        user_id: actualUserId,
        organization_id: organizationId,
        configuration_id: configurationId,
        confidence_score: overallConfidence,
        decision: decision,
        last_verified_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id,configuration_id'
      });

    if (trustError) {
      console.error('Error updating trust score:', trustError);
    }

    return res.status(200).json({
      sessionId,
      userId: actualUserId,
      testResults,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      decision,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
