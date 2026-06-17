import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID required' });
    }

    console.log('Fetching authentication events for org:', organizationId);

    const { data: events, error: eventsError } = await supabase
      .from('authentication_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('Events query error:', eventsError);
      throw eventsError;
    }

    console.log(`Retrieved ${events?.length || 0} events`);

    // Get all unique user IDs
    const userIds = new Set((events || [])
      .map((e: any) => e.user_id)
      .filter((id: any) => id !== null));

    console.log(`Found ${userIds.size} unique user IDs`);

    // Batch load all users
    let userMap: { [key: string]: string } = {};
    
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabase
        .from('org_users')
        .select('id, email')
        .eq('organization_id', organizationId)
        .in('id', Array.from(userIds));

      if (usersError) {
        console.error('Users query error:', usersError);
      } else {
        (users || []).forEach((user: any) => {
          userMap[user.id] = user.email;
        });
        console.log(`Loaded ${Object.keys(userMap).length} user emails`);
      }
    }

    // Enrich events with email
    const enriched = (events || []).map((event: any) => ({
      ...event,
      email: event.user_id ? (userMap[event.user_id] || 'N/A') : 'N/A'
    }));

    console.log('Sample enriched event email:', enriched[0]?.email);

    return res.status(200).json(enriched);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
