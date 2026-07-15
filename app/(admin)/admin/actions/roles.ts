"use server";

/**
 * Role & permission management - super-admin territory (the roles.manage
 * permission is only granted to super_admin by default, and RLS enforces the
 * same in Postgres).
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac/guards";
import { isValidPermissionKey, SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";
import { getServerSupabase } from "@/lib/supabase/server";
import { errorMessage, isValidSlug, slugify, str, withFlash } from "./helpers";

const LIST = "/admin/roles";

export async function createRoleAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    await requirePermission("roles.manage");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const name = slugify(str(formData, "name")).replace(/-/g, "_");
    if (!name || !isValidSlug(name.replace(/_/g, "-"))) {
      throw new Error("Role name must contain letters and numbers only.");
    }
    const description = str(formData, "description");

    const { error } = await supabase
      .from("roles")
      .insert({ name, description: description || null, is_system: false });
    if (error) throw error;

    revalidatePath(LIST);
    dest = withFlash(LIST, "ok", `Role "${name}" created.`);
  } catch (err) {
    dest = withFlash(LIST, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function updateRolePermissionsAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    await requirePermission("roles.manage");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const roleId = str(formData, "role_id");
    if (!roleId) throw new Error("Missing role.");

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("id", roleId)
      .single();
    if (roleError) throw roleError;
    if (role.name === SUPER_ADMIN_ROLE) {
      throw new Error("super_admin always has every permission - nothing to edit.");
    }

    const description = str(formData, "description");
    const permissions = formData
      .getAll("perm")
      .filter((p): p is string => typeof p === "string")
      .filter(isValidPermissionKey);

    const { error: descError } = await supabase
      .from("roles")
      .update({ description: description || null })
      .eq("id", roleId);
    if (descError) throw descError;

    const { error: clearError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId);
    if (clearError) throw clearError;

    if (permissions.length > 0) {
      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(permissions.map((permission_key) => ({ role_id: roleId, permission_key })));
      if (insertError) throw insertError;
    }

    revalidatePath(LIST);
    dest = withFlash(LIST, "ok", `Permissions for "${role.name}" saved.`);
  } catch (err) {
    dest = withFlash(LIST, "err", errorMessage(err));
  }
  redirect(dest);
}

export async function deleteRoleAction(formData: FormData): Promise<void> {
  let dest: string;
  try {
    await requirePermission("roles.manage");
    const supabase = await getServerSupabase();
    if (!supabase) throw new Error("Supabase is not configured.");

    const roleId = str(formData, "role_id");
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id, name, is_system")
      .eq("id", roleId)
      .single();
    if (roleError) throw roleError;
    if (role.is_system) throw new Error("Built-in roles can't be deleted.");

    // Users holding this role fall back to "no role" (no admin access).
    const { error } = await supabase.from("roles").delete().eq("id", roleId);
    if (error) throw error;

    revalidatePath(LIST);
    dest = withFlash(LIST, "ok", `Role "${role.name}" deleted.`);
  } catch (err) {
    dest = withFlash(LIST, "err", errorMessage(err));
  }
  redirect(dest);
}
