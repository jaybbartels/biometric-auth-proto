import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { organizationId } = req.query;

      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        organizationId,
        name,
        description,
        included_modules,
        allow_threshold,
        challenge_threshold,
        location_latitude,
        location_longitude,
        location_radius_km,
        geolocation_penalty
      } = req.body;

      const locationData = (location_latitude && location_longitude) ? {
        latitude: location_latitude,
        longitude: location_longitude,
        radius_km: location_radius_km,
        penalty_percent: geolocation_penalty
      } : null;

      const { data, error } = await supabase
        .from('configurations')
        .insert({
          organization_id: organizationId,
          name,
          description,
          included_modules,
          allow_threshold,
          challenge_threshold,
          deny_threshold: challenge_threshold - 10,
          location_data: locationData
        });

      if (error) throw error;
      return res.status(201).json(data);
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
