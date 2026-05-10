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

  if (href) {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={baseStyles}
        style={style}
        {...hoverHandlers}
      >
        {children}
      </a>
    );
  }

  return (
    <div className={baseStyles} style={style} {...hoverHandlers}>
      {children}
    </div>
  );
}
