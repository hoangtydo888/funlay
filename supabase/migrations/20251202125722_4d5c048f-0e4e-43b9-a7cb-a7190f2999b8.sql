-- Create view_logs table for tracking valid views
CREATE TABLE public.view_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  video_duration_seconds INTEGER,
  watch_percentage INTEGER NOT NULL DEFAULT 0,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comment_logs table for tracking rewarded comments
CREATE TABLE public.comment_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  is_rewarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_reward_limits table for tracking daily caps
CREATE TABLE public.daily_reward_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  view_rewards_earned NUMERIC NOT NULL DEFAULT 0,
  comment_rewards_earned NUMERIC NOT NULL DEFAULT 0,
  upload_rewards_earned NUMERIC NOT NULL DEFAULT 0,
  uploads_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create reward_transactions table for detailed reward history
CREATE TABLE public.reward_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  reward_type TEXT NOT NULL, -- 'VIEW', 'LIKE', 'COMMENT', 'SHARE', 'UPLOAD'
  status TEXT NOT NULL DEFAULT 'success',
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform_statistics table for admin dashboard
CREATE TABLE public.platform_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  total_videos INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  total_comments INTEGER NOT NULL DEFAULT 0,
  total_rewards_distributed NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reward_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_statistics ENABLE ROW LEVEL SECURITY;

-- RLS policies for view_logs
CREATE POLICY "Users can view their own view logs" ON public.view_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own view logs" ON public.view_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for comment_logs
CREATE POLICY "Users can view their own comment logs" ON public.comment_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own comment logs" ON public.comment_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for daily_reward_limits
CREATE POLICY "Users can view their own daily limits" ON public.daily_reward_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own daily limits" ON public.daily_reward_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own daily limits" ON public.daily_reward_limits FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for reward_transactions
CREATE POLICY "Users can view their own reward transactions" ON public.reward_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reward transactions" ON public.reward_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for platform_statistics (public read for everyone)
CREATE POLICY "Everyone can view platform statistics" ON public.platform_statistics FOR SELECT USING (true);
CREATE POLICY "Admins can manage platform statistics" ON public.platform_statistics FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_view_logs_user_date ON public.view_logs(user_id, created_at);
CREATE INDEX idx_view_logs_video ON public.view_logs(video_id);
CREATE INDEX idx_comment_logs_user_video ON public.comment_logs(user_id, video_id);
CREATE INDEX idx_daily_limits_user_date ON public.daily_reward_limits(user_id, date);
CREATE INDEX idx_reward_transactions_user ON public.reward_transactions(user_id, created_at);
CREATE INDEX idx_reward_transactions_type ON public.reward_transactions(reward_type);
CREATE INDEX idx_platform_statistics_date ON public.platform_statistics(date);

-- Trigger for updating daily_reward_limits timestamp
CREATE TRIGGER update_daily_reward_limits_updated_at
BEFORE UPDATE ON public.daily_reward_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();