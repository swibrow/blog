import { useEffect, useRef, useState, type FormEvent } from "react";

interface CommentsProps {
  term: string;
}

interface Comment {
  id: number;
  name: string;
  body: string;
  created_at: string;
}

interface Turnstile {
  render: (
    el: HTMLElement,
    options: { sitekey: string; theme: "light" | "dark"; callback: (token: string) => void },
  ) => string;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadTurnstile(): Promise<Turnstile> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = TURNSTILE_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(window.turnstile!));
    script.addEventListener("error", reject);
  });
}

const fieldStyle = {
  backgroundColor: "var(--ctp-mantle)",
  borderColor: "var(--ctp-surface0)",
  color: "var(--ctp-text)",
  "--tw-ring-color": "var(--ctp-blue)",
} as React.CSSProperties;

export default function Comments({ term }: CommentsProps) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(term)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setComments)
      .catch(() => setLoadError(true));
  }, [term]);

  useEffect(() => {
    loadTurnstile().then((turnstile) => {
      if (!widgetRef.current || widgetId.current) return;
      widgetId.current = turnstile.render(widgetRef.current, {
        sitekey: import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
        theme: document.documentElement.classList.contains("light") ? "light" : "dark",
        callback: setToken,
      });
    });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: term, name, body, token }),
    }).catch(() => null);
    setSubmitting(false);
    setToken("");
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
    if (!res?.ok) {
      setSubmitError("Couldn't post your comment. Try again.");
      return;
    }
    const comment: Comment = await res.json();
    setComments((prev) => [...(prev ?? []), comment]);
    setBody("");
  }

  return (
    <section className="mt-12 border-t pt-8 font-mono text-sm" style={{ borderColor: "var(--ctp-surface0)" }}>
      <h2 className="mb-4 text-lg" style={{ color: "var(--ctp-text)" }}>
        ~/comments
      </h2>

      {loadError && <p style={{ color: "var(--ctp-red)" }}>Comments are unavailable right now.</p>}

      {comments && comments.length > 0 && (
        <ul className="mb-8 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border p-4" style={{ borderColor: "var(--ctp-surface0)" }}>
              <div className="mb-2 flex gap-3">
                <span style={{ color: "var(--ctp-green)" }}>{c.name}</span>
                <time dateTime={c.created_at} style={{ color: "var(--ctp-overlay0)" }}>
                  {new Date(c.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words" style={{ color: "var(--ctp-text)" }}>
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          type="text"
          placeholder="Name"
          required
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none transition-colors focus:ring-2"
          style={fieldStyle}
        />
        <textarea
          placeholder="Leave a comment..."
          required
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-lg border px-4 py-2 outline-none transition-colors focus:ring-2"
          style={fieldStyle}
        />
        <div ref={widgetRef} />
        {submitError && <p style={{ color: "var(--ctp-red)" }}>{submitError}</p>}
        <button
          type="submit"
          disabled={!token || submitting}
          className="rounded-lg border px-4 py-2 transition-opacity disabled:opacity-50"
          style={{ borderColor: "var(--ctp-blue)", color: "var(--ctp-blue)" }}
        >
          {submitting ? "posting..." : "post"}
        </button>
      </form>
    </section>
  );
}
