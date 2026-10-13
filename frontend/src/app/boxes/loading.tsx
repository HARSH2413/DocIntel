export default function BoxesLoading() {
  return (
    <div className="flex-1 flex items-center justify-center py-24" role="status">
      <span className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
