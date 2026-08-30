import React, { useEffect, useState } from 'react';
import { orderService } from '../services/orderService';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    setErrorMsg('');
    const result = await orderService.fetchOrders();
    if (result.success) {
      setOrders(result.data || []);
    } else {
      setErrorMsg(result.error || 'حدث خطأ أثناء تحميل الطلبات');
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-lg text-gray-600">جاري تحميل الفواتير والطلبات...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">قائمة الطلبات والفواتير</h1>
        <button
          onClick={loadOrders}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          تحديث القائمة
        </button>
      </div>

      {errorMsg && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {errorMsg}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">لا توجد طلبات مسجلة حالياً.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            // استخراج العناصر بأمان سواء كانت من order_items أو items
            const orderItems = Array.isArray(order.order_items) && order.order_items.length > 0
              ? order.order_items
              : (Array.isArray(order.items) ? order.items : []);

            return (
              <div key={order.id} className="border border-gray-200 p-5 rounded-xl shadow-sm bg-white">
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-100">
                  <div>
                    <span className="font-bold text-gray-900">رقم الطلب: #{order.id}</span>
                    {order.customer_name && (
                      <span className="mr-3 text-sm text-gray-600">العميل: {order.customer_name}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {order.created_at ? new Date(order.created_at).toLocaleString('ar-SA') : ''}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">عناصر الفاتورة:</h4>
                  {orderItems.length === 0 ? (
                    <p className="text-sm text-red-400 italic">لا توجد عناصر مسجلة لهذا الطلب</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {orderItems.map((item, idx) => {
                        const itemName = item.product_name || item.name || 'منتج غير معروف';
                        const itemQty = item.quantity || 1;
                        const itemPrice = item.price || 0;
                        const itemTotal = item.total || (itemPrice * itemQty);

                        return (
                          <div key={idx} className="py-2 flex justify-between items-center text-sm">
                            <span className="text-gray-800 font-medium">
                              {itemName} <span className="text-gray-400 text-xs">(الكمية: {itemQty})</span>
                            </span>
                            <span className="text-gray-600 font-semibold">{itemTotal} ر.س</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100 font-bold">
                  <span className="text-gray-700">المجموع الكلي:</span>
                  <span className="text-blue-600 text-lg">{order.total_amount || order.total || 0} ر.س</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}