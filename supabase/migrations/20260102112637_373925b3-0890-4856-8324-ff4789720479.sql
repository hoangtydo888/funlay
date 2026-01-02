-- Sửa function approve_user_reward để tạo reward_transaction sau khi duyệt
CREATE OR REPLACE FUNCTION public.approve_user_reward(
  p_user_id uuid, 
  p_admin_id uuid, 
  p_note text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Reset pending và cộng vào approved
  UPDATE profiles SET 
    pending_rewards = 0,
    approved_reward = COALESCE(approved_reward, 0) + v_pending_amount
  WHERE id = p_user_id;
  
  -- TẠO REWARD TRANSACTION ĐỂ USER CÓ THỂ CLAIM
  INSERT INTO reward_transactions (user_id, amount, reward_type, status, claimed)
  VALUES (p_user_id, v_pending_amount, 'ADMIN_APPROVED', 'success', false);
  
  -- Log vào bảng approvals
  INSERT INTO reward_approvals (user_id, amount, status, admin_id, admin_note, reviewed_at)
  VALUES (p_user_id, v_pending_amount, 'approved', p_admin_id, p_note, now());
  
  RETURN v_pending_amount;
END;
$$;