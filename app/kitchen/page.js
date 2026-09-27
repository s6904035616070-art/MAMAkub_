'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function KitchenPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Fetch ออเดอร์เริ่มต้น (เฉพาะสถานะ received และ cooking)
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['received', 'cooking'])
        .order('created_at', { ascending: true }) // เก่าสุดขึ้นก่อน (FIFO)

      if (!error && data) {
        setOrders(data)
      }
      setLoading(false)
    }

    fetchOrders()

    // 2. ตั้งค่า Supabase Realtime ฟังการเปลี่ยนแปลงตาราง orders
    const channel = supabase
      .channel('kitchen_orders_channel')
      .on(
        'postgres_changes',
        {
          event: '*', // ฟังทั้ง INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === 'INSERT') {
            // ถ้ารายการใหม่มีสถานะเป็น received หรือ cooking ให้เพิ่มเข้า state
            if (['received', 'cooking'].includes(newRecord.status)) {
              setOrders((prev) => {
                // เช็คกันซ้ำ
                if (prev.some((o) => o.id === newRecord.id)) return prev
                return [...prev, newRecord]
              })
            }
          } else if (eventType === 'UPDATE') {
            // ถ้าออเดอร์เปลี่ยนเป็น served ให้ดึงออกจากการ์ดบนจอ
            if (newRecord.status === 'served') {
              setOrders((prev) => prev.filter((o) => o.id !== newRecord.id))
            } else if (['received', 'cooking'].includes(newRecord.status)) {
              // ถ้าออเดอร์อัปเดตเป็น received หรือ cooking
              setOrders((prev) => {
                const exists = prev.some((o) => o.id === newRecord.id)
                if (exists) {
                  return prev.map((o) => (o.id === newRecord.id ? newRecord : o))
                } else {
                  return [...prev, newRecord]
                }
              })
            }
          } else if (eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.id !== oldRecord.id))
          }
        }
      )
      .subscribe()

    // Clean up realtime subscription เมื่อ unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // เปลี่ยนสถานะออเดอร์เป็น 'cooking'
  const handleStartCooking = async (orderId) => {
    // Optimistic UI Update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'cooking' } : o))
    )

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cooking' })
      .eq('id', orderId)

    if (error) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message)
    }
  }

  // เปลี่ยนสถานะออเดอร์เป็น 'served' (การ์ดจะหายไปทันที)
  const handleSetServed = async (orderId) => {
    // Optimistic UI Update
    setOrders((prev) => prev.filter((o) => o.id !== orderId))

    const { error } = await supabase
      .from('orders')
      .update({ status: 'served' })
      .eq('id', orderId)

    if (error) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + error.message)
    }
  }

  // ฟังก์ชั่นฟอร์แมตเวลา HH:mm
  const formatTime = (isoString) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#111827', // พักสายตาสีเข้ม เหมาะสำหรับจอในครัว
        color: '#f9fafb',
        padding: '1.5rem',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Header จอครัว */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '2px solid #374151',
        }}
      >
        <h1 style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0 }}>
          👨‍🍳 จอห้องครัว (Kitchen Display System)
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              background: '#065f46',
              color: '#34d399',
              fontWeight: 'bold',
              fontSize: '1.1rem',
            }}
          >
            ● Realtime Active
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9ca3af' }}>
            รอดำเนินการ: {orders.length} รายการ
          </span>
        </div>
      </header>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: 'center', fontSize: '1.8rem', marginTop: '4rem', color: '#9ca3af' }}>
          กำลังดึงข้อมูลออเดอร์...
        </div>
      ) : orders.length === 0 ? (
        /* Empty state */
        <div
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            marginTop: '6rem',
            color: '#6b7280',
          }}
        >
          🎉 ไม่มีออเดอร์ค้างในขณะนี้
        </div>
      ) : (
        /* Grid Layout หลายคอลัมน์ อ่านง่าย */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {orders.map((order) => {
            const isCooking = order.status === 'cooking'

            return (
              <div
                key={order.id}
                style={{
                  background: isCooking ? '#292524' : '#1f2937',
                  borderRadius: '16px',
                  border: isCooking ? '3px solid #f59e0b' : '3px solid #3b82f6',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Header ของการ์ด (เลขโต๊ะ + เวลา) */}
                <div
                  style={{
                    background: isCooking ? '#f59e0b' : '#3b82f6',
                    color: isCooking ? '#78350f' : '#ffffff',
                    padding: '0.8rem 1.2rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '2.5rem', fontWeight: '900', lineHeight: 1 }}>
                    โต๊ะ {order.table_number}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
                      {formatTime(order.created_at)} น.
                    </div>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.3)',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isCooking ? 'กำลังทำ' : 'ออเดอร์ใหม่'}
                    </span>
                  </div>
                </div>

                {/* รายการอาหารทั้งหมด */}
                <div style={{ padding: '1.2rem', flex: 1 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {Array.isArray(order.items) &&
                      order.items.map((item, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.6rem 0',
                            borderBottom: '1px solid #374151',
                            fontSize: '1.5rem', // ขนาดใหญ่สำหรับมองระยะไกล
                            fontWeight: 'bold',
                          }}
                        >
                          <span style={{ color: '#f9fafb' }}>{item.name}</span>
                          <span
                            style={{
                              background: '#374151',
                              color: '#f32424',
                              color: '#fbbf24',
                              padding: '0.2rem 0.8rem',
                              borderRadius: '8px',
                              fontSize: '1.6rem',
                              fontWeight: '900',
                            }}
                          >
                            x{item.quantity}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* ปุ่ม action ด้านล่างการ์ด */}
                <div style={{ padding: '1rem', background: '#111827', display: 'flex', gap: '0.8rem' }}>
                  {!isCooking ? (
                    <button
                      type="button"
                      onClick={() => handleStartCooking(order.id)}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: '#f59e0b',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      🔥 เริ่มทำ
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetServed(order.id)}
                      style={{
                        flex: 1,
                        padding: '1rem',
                        background: '#16a34a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1.3rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                      }}
                    >
                      ✅ จัดเสิร์ฟแล้ว
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
