export function PlayerAvatar({
  src,
  initials,
  size = 42
}: {
  src?: string | null;
  initials: string;
  size?: number;
}) {
  return (
    <span
      className="avatar-wrap"
      style={{
        width: size,
        height: size
      }}
    >
      {src ? <img src={src} alt="" /> : <span>{initials}</span>}
    </span>
  );
}
