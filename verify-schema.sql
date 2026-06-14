-- Check authentication_events table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'authentication_events'
ORDER BY ordinal_position;

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'authentication_events';

-- Check recent records
SELECT id, user_id, organization_id, overall_confidence, decision, created_at
FROM authentication_events
ORDER BY created_at DESC
LIMIT 10;
