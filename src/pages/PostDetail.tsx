import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { posts } from "@/data/posts";
import Markdown from "@components/ui/Markdown";
import Comments from "@components/ui/Comments";
import NotFound from "./NotFound";

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>();
  const post = posts.find((p) => p.slug === slug);

  if (!post) return <NotFound />;

  return (
    <motion.main
      className="mx-auto max-w-4xl px-4 py-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to="/posts"
        className="mb-6 inline-block font-mono text-sm transition-colors"
        style={{ color: "var(--ctp-subtext0)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ctp-green)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ctp-subtext0)")}
      >
        ← back to posts
      </Link>

      <header className="mb-8">
        <h1
          className="mb-3 font-mono text-2xl font-bold md:text-3xl"
          style={{ color: "var(--ctp-lavender)" }}
        >
          {post.title}
        </h1>
        {post.description && (
          <p className="mb-4 text-base" style={{ color: "var(--ctp-subtext1)" }}>
            {post.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <time className="font-mono text-sm" style={{ color: "var(--ctp-subtext0)" }}>
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
          {post.author && (
            <span className="font-mono text-sm" style={{ color: "var(--ctp-subtext0)" }}>
              by {post.author}
            </span>
          )}
        </div>
        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded px-2 py-0.5 font-mono text-xs"
                style={{ backgroundColor: "var(--ctp-surface0)", color: "var(--ctp-subtext0)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      <Markdown content={post.content} />

      <Comments term={post.slug} />
    </motion.main>
  );
}
