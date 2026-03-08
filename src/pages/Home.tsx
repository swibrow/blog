import Hero from "@components/home/Hero";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { posts } from "@/data/posts";
import { projects } from "@/data/projects";
import Card from "@components/ui/Card";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5 },
};


export default function Home() {
  const recentPosts = posts.slice(0, 3);
  const featuredProjects = projects.filter(p => p.links && p.links.length > 0).slice(0, 4);

  return (
    <div>
      <Hero />

      {/* Recent Posts */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <motion.div {...fadeInUp}>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-mono text-2xl font-bold" style={{ color: "var(--ctp-green)" }}>
              ~/recent-posts
            </h2>
            <Link
              to="/posts"
              className="font-mono text-sm transition-colors"
              style={{ color: "var(--ctp-lavender)" }}
            >
              view all →
            </Link>
          </div>
        </motion.div>
        <div className="flex flex-col gap-4">
          {recentPosts.map((post, i) => (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card href={`/posts/${post.slug}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-mono text-base font-bold" style={{ color: "var(--ctp-blue)" }}>
                      {post.title}
                    </h3>
                    {post.description && (
                      <p className="mt-1 text-sm" style={{ color: "var(--ctp-subtext1)" }}>
                        {post.description}
                      </p>
                    )}
                  </div>
                  <time
                    className="shrink-0 font-mono text-xs"
                    style={{ color: "var(--ctp-subtext0)" }}
                  >
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                {post.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded px-1.5 py-0.5 font-mono text-xs"
                        style={{ backgroundColor: "var(--ctp-surface0)", color: "var(--ctp-subtext0)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="mx-auto max-w-6xl px-4 py-20" style={{ borderTop: "1px solid var(--ctp-surface0)" }}>
        <motion.div {...fadeInUp}>
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-mono text-2xl font-bold" style={{ color: "var(--ctp-green)" }}>
              ~/projects
            </h2>
            <Link
              to="/projects"
              className="font-mono text-sm transition-colors"
              style={{ color: "var(--ctp-lavender)" }}
            >
              view all →
            </Link>
          </div>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2">
          {featuredProjects.map((project, i) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card>
                <h3 className="mb-1 font-mono text-base font-bold" style={{ color: "var(--ctp-blue)" }}>
                  {project.name}
                </h3>
                <p className="mb-2 text-sm" style={{ color: "var(--ctp-text)" }}>
                  {project.description}
                </p>
                {project.links && (
                  <div className="flex flex-wrap gap-3">
                    {project.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs transition-colors hover:underline"
                        style={{ color: "var(--ctp-lavender)" }}
                      >
                        {link.label} →
                      </a>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
