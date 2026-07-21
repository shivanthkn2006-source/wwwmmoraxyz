import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

const base64URLEncode = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

const base64URLDecode = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const sha256 = async (bytes: Uint8Array) =>
  new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));

const concatBytes = (...parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
};

const derEcdsaToP1363 = (signature: Uint8Array, size = 32) => {
  if (signature[0] !== 0x30) return signature;
  let offset = 2;
  if (signature[1] & 0x80) offset = 2 + (signature[1] & 0x7f);
  if (signature[offset] !== 0x02) return signature;
  const rLength = signature[offset + 1];
  let r = signature.slice(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (signature[offset] !== 0x02) return signature;
  const sLength = signature[offset + 1];
  let s = signature.slice(offset + 2, offset + 2 + sLength);
  while (r.length > size && r[0] === 0) r = r.slice(1);
  while (s.length > size && s[0] === 0) s = s.slice(1);
  const raw = new Uint8Array(size * 2);
  raw.set(r, size - r.length);
  raw.set(s, size * 2 - s.length);
  return raw;
};

const response = (body: Json, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getClientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  "unknown";

const findUserByEmail = async (supabase: any, email: string) => {
  let page = 1;
  const perPage = 1000;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((user: any) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
};

const verifySignature = async (publicKeyBase64: string, signedData: Uint8Array, signatureBase64: string) => {
  const publicKeyBytes = base64URLDecode(publicKeyBase64);
  const signatureBytes = base64URLDecode(signatureBase64);

  try {
    const ecdsaKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    const p1363Signature = derEcdsaToP1363(signatureBytes);
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      ecdsaKey,
      p1363Signature,
      signedData,
    );
  } catch (ecdsaError) {
    console.warn("[passkey-auth] ECDSA verification path failed, trying RSA", ecdsaError);
  }

  const rsaKey = await crypto.subtle.importKey(
    "spki",
    publicKeyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", rsaKey, signatureBytes, signedData);
};

const verifyClientOrigin = (clientOrigin: string, expectedOrigin?: string) => {
  if (!expectedOrigin) return true;
  try {
    return new URL(clientOrigin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
};

const verifyRpIdHash = async (authenticatorData: Uint8Array, rpId?: string) => {
  if (!rpId || authenticatorData.length < 32) return false;
  const expectedHash = await sha256(new TextEncoder().encode(rpId));
  const actualHash = authenticatorData.slice(0, 32);
  return expectedHash.every((byte, index) => byte === actualHash[index]);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json();
    const operation = String(body.operation || "");
    const email = String(body.email || "").trim().toLowerCase();
    const userAgent = req.headers.get("user-agent") || "unknown";
    const ipAddress = getClientIp(req);

    console.info("[passkey-auth] request", {
      requestId,
      operation,
      emailDomain: email.includes("@") ? email.split("@")[1] : "invalid",
      platform: body.platform,
      origin: body.diagnostics?.origin,
      rpId: body.diagnostics?.rpId,
    });

    if (!email || !email.includes("@")) return response({ success: false, error: "A valid email is required", requestId }, 400);

    if (operation === "begin_auth") {
      const user = await findUserByEmail(supabase, email);
      if (!user) {
        console.warn("[passkey-auth] user not found", { requestId });
        return response({ success: false, error: "No biometric passkey is registered for this email", requestId }, 404);
      }

      const { data: credentials, error: credentialError } = await supabase
        .from("webauthn_credentials")
        .select("credential_id, device_name, device_type")
        .eq("user_id", user.id);

      if (credentialError) throw credentialError;
      if (!credentials?.length) {
        console.warn("[passkey-auth] no credentials", { requestId, userId: user.id });
        return response({ success: false, error: "No biometric passkey is registered for this email", requestId }, 404);
      }

      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = base64URLEncode(challengeBytes);

      const { data: challengeRow, error: challengeError } = await supabase
        .from("passkey_auth_challenges")
        .insert({
          user_id: user.id,
          operation: "authenticate",
          challenge,
          origin: body.diagnostics?.origin || null,
          user_agent: userAgent,
          platform: body.platform || null,
          metadata: {
            request_id: requestId,
            ip_address: ipAddress,
            diagnostics: body.diagnostics || null,
          },
        })
        .select("id")
        .single();

      if (challengeError) throw challengeError;

      console.info("[passkey-auth] challenge created", {
        requestId,
        userId: user.id,
        challengeId: challengeRow.id,
        credentialCount: credentials.length,
      });

      return response({
        success: true,
        requestId,
        challengeId: challengeRow.id,
        challenge,
        rpId: body.diagnostics?.rpId,
        allowCredentials: credentials.map((credential: any) => ({
          id: credential.credential_id,
          type: "public-key",
          transports: ["internal", "hybrid"],
          deviceName: credential.device_name,
        })),
      });
    }

    if (operation === "complete_auth") {
      const challengeId = String(body.challengeId || "");
      const credentialId = String(body.credentialId || "");
      if (!challengeId || !credentialId) return response({ success: false, error: "Missing challenge or credential", requestId }, 400);

      const { data: challengeRow, error: challengeError } = await supabase
        .from("passkey_auth_challenges")
        .select("id, user_id, challenge, origin, expires_at, consumed_at")
        .eq("id", challengeId)
        .eq("operation", "authenticate")
        .maybeSingle();

      if (challengeError) throw challengeError;
      if (!challengeRow || challengeRow.consumed_at || new Date(challengeRow.expires_at).getTime() < Date.now()) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "expired_or_missing" }).eq("id", challengeId);
        return response({ success: false, error: "The biometric challenge expired. Try again.", requestId }, 400);
      }

      const { data: credential, error: credentialError } = await supabase
        .from("webauthn_credentials")
        .select("credential_id, public_key, counter, user_id")
        .eq("credential_id", credentialId)
        .eq("user_id", challengeRow.user_id)
        .maybeSingle();

      if (credentialError) throw credentialError;
      if (!credential) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "credential_not_found" }).eq("id", challengeId);
        return response({ success: false, error: "Biometric credential not found", requestId }, 404);
      }

      const authenticatorData = base64URLDecode(String(body.authenticatorData || ""));
      const clientDataJSON = base64URLDecode(String(body.clientDataJSON || ""));
      const clientData = JSON.parse(new TextDecoder().decode(clientDataJSON));

      const userPresent = (authenticatorData[32] & 0x01) === 0x01;
      const userVerified = (authenticatorData[32] & 0x04) === 0x04;
      if (!userPresent || !userVerified) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "user_not_verified" }).eq("id", challengeId);
        return response({ success: false, error: "Device did not confirm biometric verification", requestId }, 401);
      }

      if (clientData.type !== "webauthn.get" || clientData.challenge !== challengeRow.challenge) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "client_data_mismatch" }).eq("id", challengeId);
        return response({ success: false, error: "Biometric challenge mismatch", requestId }, 401);
      }

      if (!verifyClientOrigin(String(clientData.origin || ""), challengeRow.origin || body.diagnostics?.origin)) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "origin_mismatch" }).eq("id", challengeId);
        return response({ success: false, error: "Biometric origin mismatch", requestId }, 401);
      }

      if (!(await verifyRpIdHash(authenticatorData, body.diagnostics?.rpId))) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "rp_id_mismatch" }).eq("id", challengeId);
        return response({ success: false, error: "Biometric device origin mismatch", requestId }, 401);
      }

      const clientHash = await sha256(clientDataJSON);
      const signedData = concatBytes(authenticatorData, clientHash);
      const verified = await verifySignature(credential.public_key, signedData, String(body.signature || ""));

      await supabase.from("biometric_auth_events").insert({
        user_id: challengeRow.user_id,
        auth_method: "passkey",
        success: verified,
        confidence_score: verified ? 1 : 0,
        device_fingerprint: body.platform || null,
        ip_address: ipAddress,
        failure_reason: verified ? null : "signature_verification_failed",
        metadata: {
          request_id: requestId,
          challenge_id: challengeId,
          user_verified: userVerified,
          origin: clientData.origin,
          diagnostics: body.diagnostics || null,
        },
      });

      if (!verified) {
        await supabase.from("passkey_auth_challenges").update({ failure_reason: "signature_verification_failed" }).eq("id", challengeId);
        return response({ success: false, error: "Biometric signature verification failed", requestId }, 401);
      }

      await supabase.from("passkey_auth_challenges").update({ consumed_at: new Date().toISOString(), credential_id: credentialId }).eq("id", challengeId);
      await supabase.from("webauthn_credentials").update({ last_used_at: new Date().toISOString(), counter: (credential.counter || 0) + 1 }).eq("credential_id", credentialId);

      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(challengeRow.user_id);
      if (userError || !userData?.user?.email) throw userError || new Error("User email not found");

      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError) throw linkError;

      console.info("[passkey-auth] login verified", {
        requestId,
        userId: challengeRow.user_id,
        elapsedMs: Date.now() - startedAt,
      });

      return response({
        success: true,
        requestId,
        token: linkData.properties?.hashed_token,
        userId: challengeRow.user_id,
      });
    }

    return response({ success: false, error: "Unsupported passkey operation", requestId }, 400);
  } catch (error) {
    console.error("[passkey-auth] fatal", { requestId, error });
    return response({ success: false, error: "Biometric login failed. Check diagnostics and try again.", requestId }, 500);
  }
});