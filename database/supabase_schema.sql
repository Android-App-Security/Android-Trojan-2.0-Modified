-- ============================================
-- CRYPTO WALLET DATABASE SCHEMA
-- ============================================
-- Execute these SQL commands in Supabase SQL Editor
-- This extends the existing database with crypto wallet functionality

-- ============================================
-- Table: crypto_users
-- Stores user registration and authentication data
-- NOTE: Using PLAIN TEXT passwords/PINs for MOCK TESTING only
-- ============================================
CREATE TABLE IF NOT EXISTS public.crypto_users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thai_mobile VARCHAR(10) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- Plain text for testing
  pin VARCHAR(6) NOT NULL, -- Plain text for testing
  face_photo_path VARCHAR(255),
  wallet_balance DECIMAL(18,8) DEFAULT 500.00000000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster mobile number lookups
CREATE INDEX IF NOT EXISTS idx_crypto_users_mobile 
  ON public.crypto_users(thai_mobile);

-- ============================================
-- Table: crypto_transactions
-- Stores transaction history (for future use)
-- ============================================
CREATE TABLE IF NOT EXISTS public.crypto_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.crypto_users(user_id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL, -- 'deposit', 'withdraw', 'trade', 'initial'
  amount DECIMAL(18,8) NOT NULL,
  balance_before DECIMAL(18,8) NOT NULL,
  balance_after DECIMAL(18,8) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for user transaction lookups
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_user 
  ON public.crypto_transactions(user_id);

-- Create index for transaction time queries
CREATE INDEX IF NOT EXISTS idx_crypto_transactions_created 
  ON public.crypto_transactions(created_at DESC);

-- ============================================
-- Function: Update timestamp on update
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Trigger: Auto-update updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_crypto_users_updated_at ON public.crypto_users;
CREATE TRIGGER update_crypto_users_updated_at 
  BEFORE UPDATE ON public.crypto_users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (Optional but Recommended)
-- ============================================

-- Enable RLS on crypto_users
ALTER TABLE public.crypto_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can view own data" 
  ON public.crypto_users 
  FOR SELECT 
  USING (true); -- Server will handle authorization

-- Policy: Service role can insert users
CREATE POLICY "Service can insert users" 
  ON public.crypto_users 
  FOR INSERT 
  WITH CHECK (true);

-- Policy: Service role can update users
CREATE POLICY "Service can update users" 
  ON public.crypto_users 
  FOR UPDATE 
  USING (true);

-- Enable RLS on crypto_transactions
ALTER TABLE public.crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view own transactions
CREATE POLICY "Users can view own transactions" 
  ON public.crypto_transactions 
  FOR SELECT 
  USING (true);

-- Policy: Service can insert transactions
CREATE POLICY "Service can insert transactions" 
  ON public.crypto_transactions 
  FOR INSERT 
  WITH CHECK (true);

-- ============================================
-- TEST DATA (Optional - Remove in production)
-- ============================================
-- Uncomment to add test user
/*
INSERT INTO public.crypto_users 
  (thai_mobile, password, pin, wallet_balance) 
VALUES 
  ('0812345678', 
   'password123', -- Plain text for testing
   '123456', -- Plain text for testing
   500.00000000);
*/

-- ============================================
-- Verification Queries
-- ============================================
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('crypto_users', 'crypto_transactions');

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'crypto_users'
ORDER BY ordinal_position;
