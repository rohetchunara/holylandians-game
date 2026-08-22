/*
# Auto-create profile on signup

## Problem
When a new user signs up via Supabase Auth, no row is created in the `profiles` table.
The ProfileSetup component tries to UPDATE a non-existent row, which silently affects
0 rows and returns null data — causing the user to be stuck on the login/profile setup loop.

## Fix
Create a trigger function that auto-inserts a profile row when a new auth user is created.
The row uses `auth.uid()` as the id (matching the profiles table default) and seeds
default values for all required columns.

## Security
The trigger runs as SECURITY DEFINER (elevated privileges) because it needs to insert
into the profiles table during the auth flow. EXECUTE is revoked from anon and public
to prevent direct calls.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, points, is_admin, is_banned, verified, name_locked)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    100,
    false,
    false,
    false,
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Revoke direct execution from anon and public
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();