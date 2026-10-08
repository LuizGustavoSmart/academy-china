import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

/** Garante que quem chama é admin. Lança 403 caso contrário. */
export async function assertAdmin(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

async function log(ctx: Ctx, acao: string, detalhes?: unknown) {
  await ctx.supabase.from("admin_access_log").insert({ user_id: ctx.userId, acao, detalhes: detalhes ?? null });
}

const roleEnum = z.enum(["admin", "usuario"]);

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      nome: (u.user_metadata?.nome as string) ?? "",
      role: (roles ?? []).some((r) => r.user_id === u.id && r.role === "admin") ? "admin" : "usuario",
      banido: !!u.banned_until && new Date(u.banned_until) > new Date(),
      ultimo_login: u.last_sign_in_at ?? null,
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      email: z.string().trim().email().max(255),
      nome: z.string().trim().max(120).optional().default(""),
      senha: z.string().min(10).max(72),
      role: roleEnum,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "admin" });
    }
    await log(context, "criar_usuario", { email: data.email, role: data.role });
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      nome: z.string().trim().max(120).optional(),
      role: roleEnum.optional(),
      senha: z.string().min(10).max(72).optional(),
      banido: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId && (data.role === "usuario" || data.banido)) {
      throw new Error("Você não pode remover seu próprio acesso de admin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const attrs: Record<string, unknown> = {};
    if (data.nome !== undefined) attrs.user_metadata = { nome: data.nome };
    if (data.senha) attrs.password = data.senha;
    if (data.banido !== undefined) attrs.ban_duration = data.banido ? "876000h" : "none";
    if (Object.keys(attrs).length) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, attrs);
      if (error) throw new Error(error.message);
    }
    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.id, role: "admin" }, { onConflict: "user_id,role" });
    } else if (data.role === "usuario") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id).eq("role", "admin");
    }
    await log(context, "editar_usuario", { id: data.id, role: data.role, banido: data.banido, senha: !!data.senha });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id === context.userId) throw new Error("Você não pode excluir a própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    await log(context, "excluir_usuario", { id: data.id });
    return { ok: true };
  });
