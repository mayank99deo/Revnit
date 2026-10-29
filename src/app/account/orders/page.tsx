import Link from "next/link";
import { getOrders, requireViewer } from "@/lib/data/member";
import { formatDate, formatPrice } from "@/lib/format";

const STATUS: Record<string, string> = { paid: "Paid", failed: "Failed", refunded: "Refunded" };

export default async function OrdersPage() {
  const viewer = await requireViewer("/account/orders");
  const orders = await getOrders(viewer.id);

  return (
    <>
      <h1 className="wide mb-6 text-3xl font-extrabold tracking-[-0.03em]">Orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl rounded-xl border border-edge p-8 md:p-12">
          <h2 className="wide text-2xl font-bold tracking-[-0.02em]">No orders yet</h2>
          <p className="mt-2 max-w-xl text-graphite">Exclusive families you buy will be listed here with their payment reference.</p>
          <Link href="/families?price=paid" className="btn btn-primary mt-6">
            Browse exclusive families
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-edge">
                <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Families</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Payment reference</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Status</th>
                <th scope="col" className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-rule align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(order.paid_at ?? order.created_at)}</td>
                  <td className="py-3 pr-4">
                    <ul className="space-y-1">
                      {order.items.map((item) => (
                        <li key={item.family.slug}>
                          <Link href={`/families/${item.family.slug}`} className="hover:underline">
                            {item.family.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 pr-4 text-graphite">{order.razorpay_payment_id ?? "None"}</td>
                  <td className="py-3 pr-4">{STATUS[order.status] ?? order.status}</td>
                  <td className="py-3 text-right font-semibold whitespace-nowrap">{formatPrice(order.amount_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
