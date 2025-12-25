-- Create blacklisted_wallets table
CREATE TABLE IF NOT EXISTS public.blacklisted_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  reason TEXT,
  is_permanent BOOLEAN DEFAULT true,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create reward_approvals table (history of reward approvals/rejections)
CREATE TABLE IF NOT EXISTS public.reward_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_id UUID,
  admin_note TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reward_bans table (users banned from receiving rewards)
CREATE TABLE IF NOT EXISTS public.reward_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- Add new columns to profiles for admin management
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS violation_level INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_reward NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.blacklisted_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_bans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blacklisted_wallets
CREATE POLICY "Admins can manage blacklisted wallets"
ON public.blacklisted_wallets
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view blacklisted wallets"
ON public.blacklisted_wallets
FOR SELECT
USING (true);

-- RLS Policies for reward_approvals
CREATE POLICY "Admins can manage reward approvals"
ON public.reward_approvals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own approvals"
ON public.reward_approvals
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for reward_bans
CREATE POLICY "Admins can manage reward bans"
ON public.reward_bans
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own bans"
ON public.reward_bans
FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blacklisted_wallets_address ON public.blacklisted_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_reward_approvals_user ON public.reward_approvals(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_approvals_status ON public.reward_approvals(status);
CREATE INDEX IF NOT EXISTS idx_reward_bans_user ON public.reward_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON public.profiles(banned);

-- Function: ban_user_permanently
CREATE OR REPLACE FUNCTION public.ban_user_permanently(
  p_admin_id uuid, 
  p_user_id uuid, 
  p_reason text DEFAULT 'Lạm dụng hệ thống'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet text;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can ban users';
  END IF;
  
  SELECT wallet_address INTO v_wallet FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET 
    banned = true,
    banned_at = now(),
    ban_reason = p_reason,
    violation_level = 3,
    pending_rewards = 0,
    approved_reward = 0
  WHERE id = p_user_id;
  
  IF v_wallet IS NOT NULL THEN
    INSERT INTO blacklisted_wallets (wallet_address, reason, is_permanent, user_id, created_by)
    VALUES (v_wallet, p_reason, true, p_user_id, p_admin_id)
    ON CONFLICT (wallet_address) DO NOTHING;
  END IF;
  
  INSERT INTO reward_bans (user_id, reason, expires_at, created_by)
  VALUES (p_user_id, p_reason, now() + interval '100 years', p_admin_id);
  
  RETURN true;
END;
$$;

-- Function: approve_user_reward
CREATE OR REPLACE FUNCTION public.approve_user_reward(
  p_user_id uuid, 
  p_admin_id uuid, 
  p_note text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount numeric;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve rewards';
  END IF;

  SELECT pending_rewards INTO v_pending_amount FROM profiles WHERE id = p_user_id;
  
  IF v_pending_amount IS NULL OR v_pending_amount <= 0 THEN
    RAISE EXCEPTION 'No pending reward to approve';
  END IF;
  
  UPDATE profiles SET 
    pending_rewards = 0,
    approved_reward = COALESCE(approved_reward, 0) + v_pending_amount
  WHERE id = p_user_id;
  
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'approved', p_admin_id, p_note, now());
  
  RETURN v_pending_amount;
END;
$$;

-- Function: reject_user_reward
CREATE OR REPLACE FUNCTION public.reject_user_reward(
  p_user_id uuid, 
  p_admin_id uuid, 
  p_note text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_amount numeric;
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject rewards';
  END IF;

  SELECT pending_rewards INTO v_pending_amount FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles SET pending_rewards = 0 WHERE id = p_user_id;
  
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, COALESCE(v_pending_amount, 0), 'rejected', p_admin_id, p_note, now());
  
  RETURN COALESCE(v_pending_amount, 0);
END;
$$;

-- Function: unban_user
CREATE OR REPLACE FUNCTION public.unban_user(
  p_admin_id uuid, 
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can unban users';
  END IF;
  
  UPDATE profiles SET 
    banned = false,
    banned_at = NULL,
    ban_reason = NULL,
    violation_level = 0
  WHERE id = p_user_id;
  
  DELETE FROM reward_bans WHERE user_id = p_user_id;
  
  DELETE FROM blacklisted_wallets WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;