/** Full-screen crossfading beach photos + dark overlay — backdrop for the auth screens. */
export function AuthBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-[url('/login-bg-1.jpeg')]" />
      <div className="absolute inset-0 bg-cover bg-center bg-[url('/login-bg-2.jpeg')] animate-authfade" />
      <div className="absolute inset-0 bg-slate-900/50" />
    </div>
  );
}
