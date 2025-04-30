-- Create the cars table if it doesn't exist
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Add RLS (Row Level Security) policies
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to only see their own cars
CREATE POLICY "Users can view their own cars" 
  ON cars 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own cars
CREATE POLICY "Users can insert their own cars" 
  ON cars 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own cars
CREATE POLICY "Users can update their own cars" 
  ON cars 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy to allow users to delete their own cars
CREATE POLICY "Users can delete their own cars" 
  ON cars 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add an updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS update_cars_updated_at ON cars;
CREATE TRIGGER update_cars_updated_at
BEFORE UPDATE ON cars
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Create an index on user_id for faster queries
CREATE INDEX IF NOT EXISTS cars_user_id_idx ON cars (user_id); 