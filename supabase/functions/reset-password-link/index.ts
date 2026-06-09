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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is an admin
    const { data: callerPerms, error: permError } = await adminClient
      .from("user_permissions")
      .select("role")
      .eq("email", caller.email)
      .single();

    if (permError || callerPerms?.role !== "admin") {
      return ok({ error: "Solo administradores pueden generar enlaces de restablecimiento (tu email: " + caller.email + ", rol: " + (callerPerms?.role || "sin permisos") + ")" });
    }

    // ── Parse request body ───────────────────────────────────
    const { email, redirectTo } = await req.json();

    if (!email) {
      return ok({ error: "Email es requerido" });
    }

    // ── Generate recovery link (does NOT send email) ─────────
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectTo || undefined },
      });

    if (linkError) {
      return ok({ error: "Error al generar enlace: " + linkError.message });
    }

    // Build a custom link with the token in the hash fragment so that
    // WhatsApp's link-preview crawler cannot consume the one-time token.
    const hashedToken = linkData?.properties?.hashed_token;
    const baseUrl = redirectTo || Deno.env.get("SITE_URL") || "";
    let resetLink: string | null = null;

    if (hashedToken && baseUrl) {
      resetLink = `${baseUrl}/#type=recovery&token_hash=${hashedToken}`;
    } else {
      resetLink = linkData?.properties?.action_link ?? null;
    }

    return ok({
      message: "Enlace de restablecimiento generado",
      reset_link: resetLink,
    });
  } catch (err) {
    return ok({ error: "Error inesperado: " + err.message });
  }
});
