-- Enable realtime for wallet_transactions table
ALTER TABLE wallet_transactions REPLICA IDENTITY FULL;

-- Add wallet_transactions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;