CREATE OR REPLACE FUNCTION public.unapprove_user_reward(
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
  v_approved_amount numeric;
BEGIN
  -- Kiểm tra quyền admin
  IF NOT public.has_role(p_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Only admins can unapprove rewards';
  END IF;

  -- Lấy số tiền đã duyệt
  SELECT approved_reward INTO v_approved_amount 
  FROM profiles WHERE id = p_user_id;
  
  IF v_approved_amount IS NULL OR v_approved_amount <= 0 THEN
    RAISE EXCEPTION 'No approved reward to unapprove';
  END IF;
  
  -- Chuyển từ approved_reward về pending_rewards
  UPDATE profiles SET 
    approved_reward = 0,
    pending_rewards = COALESCE(pending_rewards, 0) + v_approved_amount
  WHERE id = p_user_id;
  
  -- Đánh dấu các reward_transactions đã duyệt thành chưa duyệt
  UPDATE reward_transactions SET 
    approved = false,
    approved_at = NULL,
    approved_by = NULL
  WHERE user_id = p_user_id 
    AND approved = true 
    AND claimed = false;
  
  -- Log vào bảng approvals với status 'unapproved'
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_approved_amount, 'unapproved', p_admin_id, p_note, now());
  
  RETURN v_approved_amount;
END;
$$;