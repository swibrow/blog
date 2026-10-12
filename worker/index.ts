const SLUG = /^[a-z0-9-]{1,100}$/;
const MAX_NAME = 50;
const MAX_BODY = 2000;

interface NewComment {
  slug?: unknown;
  name?: unknown;
  body?: unknown;
  token?: unknown;
}

async function verifyTurnstile(token: string, ip: string | null, secret: string): Promise<boolean> {
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: ip ?? undefined }),
  });
  const result = await res.json<{ success: boolean }>();
  return result.success;
}

async function listComments(url: URL, env: Env): Promise<Response> {
  const slug = url.searchParams.get("slug") ?? "";
  if (!SLUG.test(slug)) return Response.json({ error: "invalid slug" }, { status: 400 });

  const { results } = await env.DB.prepare(
    "SELECT id, name, body, created_at FROM comments WHERE slug = ? ORDER BY created_at",
  )
    .bind(slug)
    .all();
  return Response.json(results);
}

async function createComment(request: Request, env: Env): Promise<Response> {
  const input = await request.json<NewComment>().catch(() => ({}) as NewComment);
  const slug = typeof input.slug === "string" ? input.slug : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const token = typeof input.token === "string" ? input.token : "";

  if (!SLUG.test(slug) || !name || name.length > MAX_NAME || !body || body.length > MAX_BODY || !token) {
    return Response.json({ error: "invalid comment" }, { status: 400 });
  }
  if (!(await verifyTurnstile(token, request.headers.get("CF-Connecting-IP"), env.TURNSTILE_SECRET_KEY))) {
    return Response.json({ error: "verification failed" }, { status: 403 });
  }

  const comment = await env.DB.prepare(
    "INSERT INTO comments (slug, name, body) VALUES (?, ?, ?) RETURNING id, name, body, created_at",
  )
    .bind(slug, name, body)
    .first();
  return Response.json(comment, { status: 201 });
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/comments") {
      if (request.method === "GET") return listComments(url, env);
      if (request.method === "POST") return createComment(request, env);
      return new Response(null, { status: 405, headers: { Allow: "GET, POST" } });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
