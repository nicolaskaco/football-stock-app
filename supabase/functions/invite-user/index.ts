import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Authenticate the caller ──────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      return new Response(
        JSON.stringify({ error: "Solo administradores pueden invitar usuarios" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Parse request body ───────────────────────────────────
    const { email, role, permissions, redirectTo } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "Email y rol son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Send the invite email ────────────────────────────────
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo || undefined,
      });

    if (inviteError) {
      // If user already exists, still allow updating permissions
      if (!inviteError.message?.includes("already been registered")) {
        return new Response(
          JSON.stringify({ error: "Error al enviar invitación: " + inviteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
      return new Response(
        JSON.stringify({ error: "Error al guardar permisos: " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Invitación enviada correctamente",
        user_id: inviteData?.user?.id ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
