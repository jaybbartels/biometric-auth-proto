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
    const { organizationId, email } = req.body;

    if (!organizationId || !email) {
      return res.status(400).json({ error: 'Organization ID and email required' });
    }

    // Generate unique code
    const enrollmentCode = `ENROLL-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from('enrollment_invites')
      .insert({
        organization_id: organizationId,
        email,
        enrollment_code: enrollmentCode,
        created_by: 'admin'
      });

    if (error) {
      // If email already exists, delete old one and create new
      if (error.message.includes('unique')) {
        await supabase
          .from('enrollment_invites')
          .delete()
          .eq('organization_id', organizationId)
          .eq('email', email);

        const { data: newData, error: newError } = await supabase
          .from('enrollment_invites')
          .insert({
            organization_id: organizationId,
            email,
            enrollment_code: enrollmentCode,
            created_by: 'admin'
          });

        if (newError) throw newError;

        return res.status(200).json({
          success: true,
          email,
          enrollmentCode,
          trainingLink: `https://biometric-auth-proto.vercel.app/training?code=${enrollmentCode}`
        });
      }
      throw error;
    }

    return res.status(200).json({
      success: true,
      email,
      enrollmentCode,
      trainingLink: `https://biometric-auth-proto.vercel.app/training?code=${enrollmentCode}`
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
