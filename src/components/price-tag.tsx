/**
 * Free, Exclusive or Owned. Amounts are deliberately left out: buyers see the
 * price once a family is in their cart.
 */
export function AccessTag({ paid, owned = false }: { paid: boolean; owned?: boolean }) {
  if (owned) return <span className="tag bg-blue-soft text-blue-deep">Owned</span>;
  if (!paid) {
    return (
      <span className="tag bg-green-soft text-green">
        <span className="h-1.5 w-1.5 rounded-full bg-green" aria-hidden="true" />
        Free
      </span>
    );
  }
  return <span className="tag bg-yellow text-ink">Exclusive</span>;
}
