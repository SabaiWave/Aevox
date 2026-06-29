-- Add indexes for high-traffic filter/sort columns on klipto tables.
-- videos.created_at: ORDER BY on dashboard list query
-- videos.status: WHERE filter on dashboard count query
-- usage_logs.event_type: WHERE filter on quota check

CREATE INDEX IF NOT EXISTS idx_videos_created_at  ON klipto.videos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_status       ON klipto.videos(status);
CREATE INDEX IF NOT EXISTS idx_usage_logs_event_type ON klipto.usage_logs(event_type);
