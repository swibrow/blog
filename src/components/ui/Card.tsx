import { Link } from "react-router-dom";

interface CardProps {
  href?: string;
  external?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ href, external, children, className = "" }: CardProps) {
  const baseStyles = `block rounded-lg border p-4 transition-all duration-200 hover:-translate-y-0.5 ${className}`;
  const style = {
    backgroundColor: "var(--ctp-mantle)",
    borderColor: "var(--ctp-surface0)",
  };
  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = "var(--ctp-surface0)";
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = "var(--ctp-mantle)";
    },
  };

  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseStyles}
        style={style}
        {...hoverHandlers}
      >
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link to={href} className={baseStyles} style={style} {...hoverHandlers}>
        {children}
      </Link>
    );
  }

  return (
    <div className={baseStyles} style={style} {...hoverHandlers}>
      {children}
    </div>
  );
}
