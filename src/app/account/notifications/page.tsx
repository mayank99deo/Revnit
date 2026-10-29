import Link from "next/link";
import { markAllRead } from "@/app/actions";
import { getNotifications, requireViewer } from "@/lib/data/member";
import { timeAgo } from "@/lib/format";

export default async function NotificationsPage() {
  const viewer = await requireViewer("/account/notifications");
  const notifications = await getNotifications(viewer.id);
  const unread = notifications.some((n) => !n.read_at);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Notifications</h1>
        {unread && (
          <form action={markAllRead}>
            <button type="submit" className="btn btn-secondary btn-sm">
              Mark all as read
            </button>
          </form>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="rounded-xl rounded-xl border border-edge p-8 md:p-12">
          <h2 className="wide text-2xl font-bold tracking-[-0.02em]">You’re all caught up</h2>
          <p className="mt-2 max-w-xl text-graphite">
            Updates to families you’ve downloaded, new families in categories you follow and progress on your requests
            show up here.
          </p>
        </div>
      ) : (
        <ul className="border-t border-edge">
          {notifications.map((n) => {
            const body = (
              <>
                <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read_at ? "border border-trace" : "bg-blue"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.read_at ? "" : "font-semibold"}`}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-[15px] text-graphite">{n.body}</span>}
                </span>
                <span className="shrink-0 text-[13px] text-graphite">{timeAgo(n.created_at)}</span>
              </>
            );
            return (
              <li key={n.id} className="border-b border-rule">
                {n.href ? (
                  <Link href={n.href} className="-mx-3 flex gap-4 rounded-lg px-3 py-4 hover:bg-wash">
                    {body}
                  </Link>
                ) : (
                  <div className="flex gap-4 py-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
