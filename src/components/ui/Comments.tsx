import Giscus from "@giscus/react";
import { useEffect, useState } from "react";

interface CommentsProps {
  term: string;
}

export default function Comments({ term }: CommentsProps) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("light") ? "light" : "dark"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mt-12 border-t pt-8" style={{ borderColor: "var(--ctp-surface0)" }}>
      <Giscus
        repo="swibrow/blog"
        repoId="R_kgDOJWErBQ"
        category="General"
        categoryId="DIC_kwDOJWErBc4CgHjk"
        mapping="specific"
        term={term}
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="top"
        theme={theme}
        lang="en"
        loading="lazy"
      />
    </div>
  );
}
