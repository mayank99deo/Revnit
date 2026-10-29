import Link from "next/link";
import { getStudioOrders } from "@/lib/data/studio";
import { formatDate, formatPrice } from "@/lib/format";

export default async function StudioOrdersPage() {
  const orders = await getStudioOrders();
  const paid = orders.filter((o) => o.status === "paid");
  const revenue = paid.reduce((sum, o) => sum + o.amount_paise, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="wide text-3xl font-extrabold tracking-[-0.03em]">Orders</h1>
          <p className="mt-1 text-graphite">
            {paid.length} paid, {formatPrice(revenue)} in total. Refunds are issued from the Razorpay dashboard.
          </p>
        </div>
      </div>
      {orders.length === 0 ? (
        <p className="rounded-xl rounded-xl border border-edge p-6 text-graphite">No orders yet. They appear here as soon as a payment is confirmed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead>
              <tr className="border-b border-edge">
                <th scope="col" className="py-2 pr-4 font-semibold">Date</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Buyer</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Families</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Payment</th>
                <th scope="col" className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-rule align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(o.paid_at ?? o.created_at)}</td>
                  <td className="py-3 pr-4">
                    {o.buyer?.full_name && <span className="block">{o.buyer.full_name}</span>}
                    <span className="text-graphite">{o.buyer?.email}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {o.items.map((i) => (
                      <Link key={i.family.slug} href={`/families/${i.family.slug}`} className="block hover:underline">
                        {i.family.name}
                      </Link>
                    ))}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={o.status === "paid" ? "font-medium" : "text-graphite"}>{o.status === "paid" ? "Paid" : o.status === "failed" ? "Failed" : "Refunded"}</span>
                    {o.razorpay_payment_id && <span className="block text-[13px] text-graphite">{o.razorpay_payment_id}</span>}
                  </td>
                  <td className="py-3 text-right font-semibold whitespace-nowrap">{formatPrice(o.amount_paise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
