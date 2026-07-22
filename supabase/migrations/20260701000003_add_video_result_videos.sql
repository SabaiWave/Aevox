-- Phase 7: add video_result column to store VideoAgent output
ALTER TABLE klipto.videos
  ADD COLUMN IF NOT EXISTS video_result jsonb;
