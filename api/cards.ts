import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const rawSupabaseUrl = process.env.SUPABASE_URL;

const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "")
  : undefined;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const supabase =
  supabaseUrl && supabaseSecretKey
    ? createClient(supabaseUrl, supabaseSecretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

const occasions = ["birthday", "thanks", "success", "love"];
const templates = ["rose", "night", "cream"];

function respond(
  res: VercelResponse,
  status: number,
  body: Record<string, unknown>,
) {
  return res.status(status).json(body);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return respond(res, 405, { error: "Method not allowed." });
  }

  if (!supabase) {
    return respond(res, 500, {
      error: "Server configuration is incomplete.",
    });
  }

  try {
    if (req.method === "POST") {
      const body = req.body;

      if (!body || typeof body !== "object" || Array.isArray(body)) {
        return respond(res, 400, { error: "Invalid request body." });
      }

      const { occasion, template, recipient, sender, message } = body;

      if (
        typeof occasion !== "string" ||
        !occasions.includes(occasion) ||
        typeof template !== "string" ||
        !templates.includes(template) ||
        typeof message !== "string" ||
        message.trim().length === 0 ||
        message.length > 500 ||
        (recipient !== undefined &&
          (typeof recipient !== "string" || recipient.length > 60)) ||
        (sender !== undefined &&
          (typeof sender !== "string" || sender.length > 60))
      ) {
        return respond(res, 400, {
          error: "Please check the card information.",
        });
      }

      console.log("Supabase URL:", supabaseUrl);
      const { data, error } = await supabase
        .from("cards")
        .insert({
          occasion,
          template,
          recipient: (recipient ?? "").trim(),
          sender: (sender ?? "").trim(),
          message: message.trim(),
        })
        .select("share_id")
        .single();

      if (error || !data) {
        console.error("Supabase insert failed:", error);

        return respond(res, 500, {
          error: "Could not save the card.",
        });
      }

      return respond(res, 201, {
        shareId: data.share_id,
      });
    }

    const shareId = req.query.shareId;

    if (
      typeof shareId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        shareId,
      )
    ) {
      return respond(res, 400, { error: "Invalid card link." });
    }

    const { data, error } = await supabase
      .from("cards")
      .select(
        "share_id, occasion, template, recipient, sender, message, created_at",
      )
      .eq("share_id", shareId)
      .maybeSingle();

    if (error) {
      return respond(res, 500, {
        error: "Could not load the card.",
      });
    }

    if (!data) {
      return respond(res, 404, { error: "Card not found." });
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");

    return respond(res, 200, { card: data });
  } catch {
    return respond(res, 500, {
      error: "An unexpected server error occurred.",
    });
  }
}
