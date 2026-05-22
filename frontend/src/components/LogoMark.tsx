type LogoMarkProps = {
  compact?: boolean;
};

export function LogoMark({ compact = false }: LogoMarkProps) {
  return (
    <div className={compact ? 'logo-wrap compact' : 'logo-wrap'}>
      <img
        className="logo-image"
        src="/logo/logo-transparent.png"
        alt="MAGI.C"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
