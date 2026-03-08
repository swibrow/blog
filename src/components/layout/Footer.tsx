import SnowEffect from "@components/react/SnowEffect";

export default function Footer() {
  return (
    <footer
      className="mt-auto border-t py-6"
      style={{ backgroundColor: "var(--ctp-mantle)", borderColor: "var(--ctp-surface0)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
        <p className="font-mono text-xs" style={{ color: "var(--ctp-subtext0)" }}>
          &copy; {new Date().getFullYear()} Samuel Wibrow
        </p>
        <SnowEffect />
      </div>
    </footer>
  );
}
