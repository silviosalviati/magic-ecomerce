type LogoMarkProps = {
  compact?: boolean;
};

export function LogoMark({ compact = false }: LogoMarkProps) {
  return (
    <div className={compact ? 'logo-wrap compact' : 'logo-wrap'}>
      <svg className="logo-symbol" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="52" className="logo-ring" />
        <path
          className="logo-m"
          d="M36 77V50c0-10 10-16 18-11l8 5c3 2 6 2 9 0l10-7c8-5 19 1 19 11v29"
        />
      </svg>
      <div className="logo-word">MAGI.C</div>
    </div>
  );
}
