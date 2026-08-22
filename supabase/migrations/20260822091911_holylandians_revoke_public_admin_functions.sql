-- Revoke EXECUTE from PUBLIC (default grant) on all admin functions
-- Then grant only to authenticated (functions check is_admin internally)
REVOKE EXECUTE ON FUNCTION admin_ban_user(uuid, boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_all_dms() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_get_all_group_messages() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_promote_user(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_update_verification_request(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION admin_verify_user(uuid, boolean) FROM PUBLIC;

-- Grant only to authenticated users (admin check is inside each function)
GRANT EXECUTE ON FUNCTION admin_ban_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_dms() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_group_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_promote_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_verification_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_user(uuid, boolean) TO authenticated;