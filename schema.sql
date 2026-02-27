-- POSH Complaints Telegram Database Schema
CREATE TABLE IF NOT EXISTS complaints_telegram (
  id SERIAL PRIMARY KEY,
  passphrase_hash VARCHAR(256) NOT NULL,
  accused_hash VARCHAR(256) NOT NULL,
  evidence_hashes TEXT[] DEFAULT '{}',
  details_encrypted TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, inquiry, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mock / Demo Data (Admin can use this to test patterns)
INSERT INTO complaints_telegram (passphrase_hash, accused_hash, evidence_hashes, details_encrypted, status)
VALUES 
  ('hash1_dummy', 'IT-Senior', '{}', 'enc_dummy1', 'pending'),
  ('hash2_dummy', 'IT-Senior', '{}', 'enc_dummy2', 'pending'),
  ('hash3_dummy', 'IT-Senior', '{}', 'enc_dummy3', 'pending'),
  ('hash4_dummy', 'HR-Manager', '{}', 'enc_dummy4', 'inquiry');
