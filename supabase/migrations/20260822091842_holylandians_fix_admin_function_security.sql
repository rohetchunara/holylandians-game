-- Revoke EXECUTE on all admin SECURITY DEFINER functions from anon
-- These functions should only be callable by authenticated users (admins)
-- The functions already check is_admin internally via auth.uid()

REVOKE EXECUTE ON FUNCTION admin_ban_user(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_get_all_dms() FROM anon;
REVOKE EXECUTE ON FUNCTION admin_get_all_group_messages() FROM anon;
REVOKE EXECUTE ON FUNCTION admin_promote_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_update_verification_request(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION admin_verify_user(uuid, boolean) FROM anon;

-- Ensure authenticated role can execute (it already has implicit access, but make it explicit)
GRANT EXECUTE ON FUNCTION admin_ban_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_dms() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_group_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_promote_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_verification_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_user(uuid, boolean) TO authenticated;