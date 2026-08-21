export default function EmptyState({ message }: { message: string }) {
  return (
    <div className="glass-surface rounded-3xl px-6 py-16 text-center text-foreground/60">
      {message}
    </div>
  );
}
