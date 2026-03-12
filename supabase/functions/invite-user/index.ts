import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Authenticate the caller ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return ok({ error: "Missing authorization header" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client scoped to the caller's JWT (respects RLS)
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return ok({ error: "Sesión inválida. Volvé a iniciar sesión. (" + (callerError?.message || "no user") + ")" });
    }

    // Admin-only client (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is an admin
    const { data: callerPerms, error: permError } = await adminClient
      .from("user_permissions")
      .select("role")
      .eq("email", caller.email)
      .single();

    if (permError || callerPerms?.role !== "admin") {
      return ok({ error: "Solo administradores pueden invitar usuarios (tu email: " + caller.email + ", rol: " + (callerPerms?.role || "sin permisos") + ")" });
    }

    // ── Parse request body ───────────────────────────────────
    const { email, role, permissions, redirectTo } = await req.json();

    if (!email || !role) {
      return ok({ error: "Email y rol son requeridos" });
    }

    // ── Generate invite link (does NOT send email) ─────────
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo: redirectTo || undefined },
      });

    let actionLink: string | null = null;

    if (linkError) {
      // If user already exists, still allow updating permissions
      if (!linkError.message?.includes("already been registered")) {
        return ok({ error: "Error al generar invitación: " + linkError.message });
      }
    } else {
      // Build a custom link that puts the token in the hash fragment so that
      // WhatsApp's link-preview crawler (which strips the hash before fetching)
      // cannot consume the one-time Supabase token.
      const hashedToken = linkData?.properties?.hashed_token;
      const baseUrl = redirectTo || Deno.env.get("SITE_URL") || "";
      if (hashedToken && baseUrl) {
        actionLink = `${baseUrl}/#type=invite&token_hash=${hashedToken}`;
      } else {
        actionLink = linkData?.properties?.action_link ?? null;
      }
    }

    // ── Insert or update user_permissions row ────────────────
    const permRow: Record<string, unknown> = {
      email: email.toLowerCase(),
      role,
      can_access_players: permissions?.can_access_players ?? false,
      can_edit_players: permissions?.can_edit_players ?? false,
      can_access_viatico: permissions?.can_access_viatico ?? false,
      can_access_widgets: permissions?.can_access_widgets ?? false,
      can_access_dirigentes: permissions?.can_access_dirigentes ?? false,
      can_access_ropa: permissions?.can_access_ropa ?? false,
      editar_nombre_especial: permissions?.editar_nombre_especial ?? false,
      view_torneo: permissions?.view_torneo ?? false,
      edit_torneo: permissions?.edit_torneo ?? false,
      can_view_comisiones: permissions?.can_view_comisiones ?? false,
      can_edit_comisiones: permissions?.can_edit_comisiones ?? false,
      can_view_partidos: permissions?.can_view_partidos ?? false,
      can_edit_partidos: permissions?.can_edit_partidos ?? false,
      can_see_ropa_widgets: permissions?.can_see_ropa_widgets ?? false,
      categoria: permissions?.categoria ?? null,
    };

    // Try upsert first; if it fails (no unique constraint), try insert
    let insertError;
    const { error: upsertErr } = await adminClient
      .from("user_permissions")
      .upsert(permRow, { onConflict: "email" });

    if (upsertErr) {
      // Fallback: check if row exists, then update or insert
      const { data: existing } = await adminClient
        .from("user_permissions")
        .select("email")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existing) {
        const { email: _e, ...updates } = permRow;
        const { error: updateErr } = await adminClient
          .from("user_permissions")
          .update(updates)
          .eq("email", email.toLowerCase());
        insertError = updateErr;
      } else {
        const { error: plainInsertErr } = await adminClient
          .from("user_permissions")
          .insert(permRow);
        insertError = plainInsertErr;
      }
    }

    if (insertError) {
      return ok({ error: "Error al guardar permisos: " + insertError.message });
    }

    return ok({
      message: "Invitación generada correctamente",
      user_id: linkData?.user?.id ?? null,
      invite_link: actionLink,
    });
  } catch (err) {
    return ok({ error: "Error inesperado: " + err.message });
  }
});
