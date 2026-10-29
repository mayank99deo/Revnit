import { RequestRow } from "@/components/studio/request-row";
import { getFamilyOptions, getStudioRequests } from "@/lib/data/studio";

export default async function StudioRequestsPage() {
  const [requests, families] = await Promise.all([getStudioRequests(), getFamilyOptions()]);
  const active = requests.filter((r) => r.status !== "shipped" && r.status !== "declined");
  const closed = requests.filter((r) => r.status === "shipped" || r.status === "declined");

  return (
    <>
      <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Requests</h1>
      <p className="mt-1 mb-6 max-w-2xl text-graphite">
        Every status change notifies the requester and everyone who voted. To mark one published, link the family first.
      </p>
      {active.length === 0 ? (
        <p className="rounded-xl rounded-xl border border-edge p-6 text-graphite">No open requests.</p>
      ) : (
        <ul className="border-t border-edge">
          {active.map((r) => (
            <RequestRow key={r.id} request={r} families={families} />
          ))}
        </ul>
      )}
      {closed.length > 0 && (
        <details className="mt-10">
          <summary className="cursor-pointer font-semibold">Published and declined ({closed.length})</summary>
          <ul className="mt-3 border-t border-edge">
            {closed.map((r) => (
              <RequestRow key={r.id} request={r} families={families} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
