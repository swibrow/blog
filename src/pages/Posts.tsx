import SectionHeading from "@components/layout/SectionHeading";
import Card from "@components/ui/Card";
import { posts } from "@/data/posts";
import { useDiscussionStats } from "@/hooks/useDiscussionStats";
import { motion } from "framer-motion";

export default function Posts() {
  const stats = useDiscussionStats();

  return (
    <SectionHeading title="posts">
      <div className="flex flex-col gap-4">
        {posts.map((post, i) => {
          const postStats = stats[post.slug];

          return (
            <motion.div
              key={post.slug}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card href={`/posts/${post.slug}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-mono text-base font-bold" style={{ color: "var(--ctp-blue)" }}>
                      {post.title}
                    </h2>
                    {post.description && (
                      <p className="mt-1 text-sm" style={{ color: "var(--ctp-subtext1)" }}>
                        {post.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {postStats && (postStats.reactions > 0 || postStats.comments > 0) && (
                      <div
                        className="flex items-center gap-3 font-mono text-xs"
                        style={{ color: "var(--ctp-subtext0)" }}
                      >
                        {postStats.reactions > 0 && (
                          <span className="flex items-center gap-1">
                            <span>👍</span> {postStats.reactions}
                          </span>
                        )}
                        {postStats.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <span>💬</span> {postStats.comments}
                          </span>
                        )}
                      </div>
                    )}
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
                </div>
                {post.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded px-1.5 py-0.5 font-mono text-xs"
                        style={{
                          backgroundColor: "var(--ctp-surface0)",
                          color: "var(--ctp-subtext0)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </SectionHeading>
  );
}
