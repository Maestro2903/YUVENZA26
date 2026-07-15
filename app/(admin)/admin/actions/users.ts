"use server";

/**
 * User management actions. Reads/writes go through the user-context client so
 * RLS applies; creating auth users requires the service role (Supabase Admin
 * API) and is therefore double-guarded here. The guard_profile_privileges
 * trigger provides a final defence against role escalation.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireSuperAdmin, isSuperAdmin, getAdminIdentity } from "@/lib/rbac/guards";
import { SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";
import { bool, errorMessage, str, withFlash } from "./helpers";

const LIST = "/admin/users";

async function roleNameById(roleId: string): Promise<string | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("roles").select("name").eq("id", roleId).maybeSingle();
  return data?.name ?? null;
}

export async function createUserAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    await requirePermission("users.manage");

    const email = str(formData, "email").toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = str(formData, "full_name");
    const roleId = str(formData, "role_id");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if (password.length < 10) throw new Error("Password must be at least 10 characters.");
    if (!roleId) throw new Error("Choose a role for the new user.");

    if ((await roleNameById(roleId)) === SUPER_ADMIN_ROLE) {
      await requireSuperAdmin();
    }

    const service = getServiceSupabase();
    if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");

    const { data: created, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (createError) throw createError;

    // The on_auth_user_created trigger seeded the profile with 'viewer';
    // apply the requested role.
    const { error: profileError } = await service
      .from("profiles")
      .update({ role_id: roleId, full_name: fullName || null })
      .eq("id", created.user.id);
    if (profileError) throw profileError;

    revalidatePath(LIST);
    dest = withFlash(LIST, "ok", `User ${email} created.`);
  } catch (err) {
    dest = withFlash(LIST, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function updateUserRoleAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    const identity = await requirePermission("users.manage");
    const userId = str(formData, "user_id");
    const roleId = str(formData, "role_id");
    if (!userId || !roleId) throw new Error("Missing user or role.");
    if (userId === identity.userId) {
      throw new Error("You can't change your own role (ask another administrator).");
    }

    // Granting or revoking super_admin is reserved for super admins.
    const targetRoleName = await roleNameById(roleId);
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { data: target } = await supabase
      .from("profiles")
      .select("role_id, roles ( name )")
      .eq("id", userId)
      .maybeSingle();
    const targetCurrentRole = Array.isArray(target?.roles) ? target?.roles[0] : target?.roles;
    if (
      (targetRoleName === SUPER_ADMIN_ROLE || targetCurrentRole?.name === SUPER_ADMIN_ROLE) &&
      !isSuperAdmin(await getAdminIdentity())
    ) {
      throw new Error("Only a super admin can grant or revoke the super_admin role.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role_id: roleId })
      .eq("id", userId);
    if (error) throw error;

    revalidatePath(LIST);
    dest = withFlash(LIST, "ok", "Role updated.");
  } catch (err) {
    dest = withFlash(LIST, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function toggleUserActiveAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    const identity = await requirePermission("users.manage");
    const userId = str(formData, "user_id");
    const active = bool(formData, "active");
    if (userId === identity.userId) throw new Error("You can't deactivate your own account.");

    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: active })
      .eq("id", userId);
    if (error) throw error;

    revalidatePath(LIST);
    dest = withFlash(LIST, "ok", active ? "Account activated." : "Account deactivated.");
  } catch (err) {
    dest = withFlash(LIST, "err", errorMessage(err));
  }
  redirect(dest);
}
