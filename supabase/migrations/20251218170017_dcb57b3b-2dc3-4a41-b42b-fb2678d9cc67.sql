-- Create watch_later table
CREATE TABLE public.watch_later (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own watch later list"
ON public.watch_later FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their own watch later list"
ON public.watch_later FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their own watch later list"
ON public.watch_later FOR DELETE
USING (auth.uid() = user_id);

-- Add last_position_seconds to video_watch_progress
ALTER TABLE public.video_watch_progress 
ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER DEFAULT 0;

-- Create watch_history table for detailed history
CREATE TABLE public.watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  last_position_seconds INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own watch history"
ON public.watch_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
ON public.watch_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
ON public.watch_history FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
ON public.watch_history FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_watch_later_user_id ON public.watch_later(user_id);
CREATE INDEX idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX idx_watch_history_watched_at ON public.watch_history(user_id, watched_at DESC);