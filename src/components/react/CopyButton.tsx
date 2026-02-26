import { useState, useCallback } from "react";

interface CopyButtonProps {
  code: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ code }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
      style={{
        position: "absolute",
        top: "8px",
        right: "8px",
        background: "var(--ctp-surface0)",
        color: "var(--ctp-subtext1)",
        border: "none",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "12px",
        cursor: "pointer",
        lineHeight: 1.4,
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
};

export default CopyButton;
