'use client'

import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function OrderPage({ params }) {
  // ⚠️ Unwrap Promise params ตามข้อกำหนด Next.js 15+
  const resolvedParams = use(params)
  const tableNumber = resolvedParams?.tableNumber

  // Status & Session State
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [sessionClosed, setSessionClosed] = useState(false)

  // Data State
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [activeCategoryId, setActiveCategoryId] = useState(null)

  // Cart State (สูงสุด 10 รายการ)
  const [cart, setCart] = useState([]) // Array ของ { id, name, quantity }
  const [submittingOrder, setSubmittingOrder] = useState(false)
  const [orderSuccessMsg, setOrderSuccessMsg] = useState('')

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [closingSession, setClosingSession] = useState(false)

  // 1. ตรวจสอบ Session และดึงข้อมูลเมนูอาหาร
  useEffect(() => {
    if (!tableNumber) return

    const initPage = async () => {
      setLoading(true)

      // 1.1 เช็ค session ที่ table_number ตรงกัน และ status = 'open'
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', tableNumber)
        .eq('status', 'open')
        .maybeSingle()

      if (sessionError || !sessionData) {
        setSession(null)
        setLoading(false)
        return
      }

      setSession(sessionData)

      // 1.2 ดึงหมวดหมู่เมนู
      const { data: catData } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      // 1.3 ดึงรายการเมนูทั้งหมด
      const { data: itemData } = await supabase
        .from('menu_items')
        .select('*')

      if (catData && catData.length > 0) {
        setCategories(catData)
        setActiveCategoryId(catData[0].id)
      }
      if (itemData) {
        setMenuItems(itemData)
      }

      setLoading(false)
    }

    initPage()
  }, [tableNumber])

  // จัดการเพิ่มลงตะกร้า (จำกัดจำนวน 1-5 ชิ้นต่อรายการ)
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((c) => c.id === item.id)
      if (existing) {
        if (existing.quantity >= 5) {
          alert('เลือกได้สูงสุด 5 ชิ้นต่อรายการครับ')
          return prevCart
        }
        return prevCart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      } else {
        return [...prevCart, { id: item.id, name: item.name, quantity: 1 }]
      }
    })
  }

  // ปรับจำนวนหรือลบรายการในตะกร้า
  const updateQuantity = (itemId, delta) => {
    setCart((prevCart) => {
      return prevCart
        .map((c) => {
          if (c.id === itemId) {
            const newQty = c.quantity + delta
            if (newQty > 5) {
              alert('เลือกได้สูงสุด 5 ชิ้นต่อรายการครับ')
              return c
            }
            return { ...c, quantity: newQty }
          }
          return c
        })
        .filter((c) => c.quantity > 0)
    })
  }

  // คำนวณจำนวนรายการรวมในตะกร้า
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // 2. กดส่งออเดอร์
  const handleSendOrder = async () => {
    if (cart.length === 0) return
    if (totalCartItems > 10) {
      alert('สามารถส่งได้สูงสุด 10 รายการต่อการส่ง 1 ครั้งครับ')
      return
    }

    setSubmittingOrder(true)
    setOrderSuccessMsg('')

    try {
      // เตรียม payload ของรายการอาหาร { name, quantity }
      const orderItems = cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
      }))

      const { error } = await supabase.from('orders').insert([
        {
          session_id: session.id,
          table_number: tableNumber,
          items: orderItems,
          status: 'received',
        },
      ])

      if (error) throw error

      // ส่งสำเร็จ -> เคลียร์ตะกร้า ขึ้นข้อความแจ้งเตือน
      setCart([])
      setOrderSuccessMsg('✓ ส่งออเดอร์แล้ว เรียบร้อยครับ!')
      setTimeout(() => setOrderSuccessMsg(''), 4000)
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการส่งออเดอร์: ' + err.message)
    } finally {
      setSubmittingOrder(false)
    }
  }

  // 3. ยืนยันปิดโต๊ะ / เรียกเก็บเงิน
  const handleConfirmPayment = async () => {
    if (!session) return
    setClosingSession(true)

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id)

      if (error) throw error

      setShowPaymentModal(false)
      setSessionClosed(true)
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการปิดโต๊ะ: ' + err.message)
    } finally {
      setClosingSession(false)
    }
  }

  // คำนวณยอดเงินรวม
  const totalPrice = session
    ? (session.adult_count || 0) * 289 + (session.child_count || 0) * 145
    : 0

  // Filter เมนูตามหมวดหมู่ที่เลือก
  const filteredMenuItems = menuItems.filter(
    (item) => item.category_id === activeCategoryId
  )

  // SCREEN 1: โหลดข้อมูลอยู่
  if (loading) {
    return (
      <main style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>กำลังโหลดข้อมูลเมนู...</p>
      </main>
    )
  }

  // SCREEN 2: ปิด session สำเร็จแล้ว
  if (sessionClosed) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          background: '#f9fafb',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontSize: '2rem', color: '#16a34a', marginBottom: '0.5rem' }}>
          ขอบคุณที่ใช้บริการ
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#4b5563' }}>
          ร้าน MAMAkub ยินดีให้บริการครับ
        </p>
      </main>
    )
  }

  // SCREEN 3: ไม่พบ Session ที่เปิดใช้งาน
  if (!session) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'sans-serif',
          background: '#fef2f2',
        }}
      >
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.8rem', color: '#dc2626', marginBottom: '1rem' }}>
          โต๊ะนี้ยังไม่เปิดใช้งาน กรุณาแจ้งพนักงาน
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>
          โต๊ะที่ {tableNumber}
        </p>
      </main>
    )
  }

  // SCREEN 4: หน้าสั่งอาหารหลักสำหรับมือถือ
  return (
    <main
      style={{
        maxWidth: '500px',
        margin: '0 auto',
        minHeight: '100vh',
        paddingBottom: cart.length > 0 ? '120px' : '40px',
        fontFamily: 'sans-serif',
        background: '#f9fafb',
        color: '#1f2937',
        position: 'relative',
      }}
    >
      {/* Header Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0.8rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
            🍜 โต๊ะ {tableNumber}
          </h1>
          <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
            ผู้ใหญ่ {session.adult_count} · เด็ก {session.child_count}
          </span>
        </div>

        {/* ปุ่มเรียกเก็บเงิน */}
        <button
          type="button"
          onClick={() => setShowPaymentModal(true)}
          style={{
            padding: '0.5rem 0.9rem',
            background: '#16a34a',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
          }}
        >
          💳 เรียกเก็บเงิน
        </button>
      </header>

      {/* ข้อความแจ้งเตือนเมื่อส่งออเดอร์สำเร็จ */}
      {orderSuccessMsg && (
        <div
          style={{
            margin: '0.8rem 1rem 0 1rem',
            padding: '0.8rem',
            background: '#dcfce7',
            color: '#15803d',
            borderRadius: '8px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '1rem',
            border: '1px solid #86efac',
          }}
        >
          {orderSuccessMsg}
        </div>
      )}

      {/* หมวดหมู่เมนูแบบแท็บ 5 หมวด */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0.5rem',
          gap: '0.5rem',
          position: 'sticky',
          top: '57px',
          zIndex: 9,
        }}
      >
        {categories.map((cat) => {
          const isActive = cat.id === activeCategoryId
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                padding: '0.6rem 1rem',
                border: 'none',
                borderRadius: '20px',
                background: isActive ? '#e11d48' : '#f3f4f6',
                color: isActive ? '#fff' : '#374151',
                fontWeight: isActive ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* รายการเมนูย่อย */}
      <div style={{ padding: '1rem' }}>
        {filteredMenuItems.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', marginTop: '2rem' }}>
            ไม่มีรายการอาหารในหมวดนี้
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {filteredMenuItems.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id)
              const qty = cartItem ? cartItem.quantity : 0

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '0.9rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #f3f4f6',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <span style={{ fontSize: '1.05rem', fontWeight: '500' }}>
                    {item.name}
                  </span>

                  {/* ปุ่มปรับจำนวนหรือกดสั่ง */}
                  {qty > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: '1px solid #d1d5db',
                          background: '#f9fafb',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          border: 'none',
                          background: '#e11d48',
                          color: '#fff',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      style={{
                        padding: '0.4rem 1rem',
                        background: '#e11d48',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '16px',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                      }}
                    >
                      + เพิ่ม
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ตะกร้าลอยด้านล่าง (Floating Cart) */}
      {cart.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            background: '#ffffff',
            borderTop: '2px solid #f3f4f6',
            padding: '0.8rem 1rem',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
            zIndex: 20,
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.6rem',
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
              🛒 ตะกร้าของคุณ ({totalCartItems}/10 รายการ)
            </span>
            <button
              type="button"
              onClick={() => setCart([])}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              ล้างตะกร้า
            </button>
          </div>

          <button
            type="button"
            disabled={submittingOrder}
            onClick={handleSendOrder}
            style={{
              width: '100%',
              padding: '0.9rem',
              background: submittingOrder ? '#9ca3af' : '#e11d48',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: submittingOrder ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {submittingOrder ? 'กำลังส่งออเดอร์...' : `ส่งออเดอร์ (${totalCartItems} รายการ)`}
          </button>
        </div>
      )}

      {/* MODAL: ยืนยันเรียกเก็บเงิน */}
      {showPaymentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem 0',
                fontSize: '1.4rem',
                textAlign: 'center',
                color: '#111827',
              }}
            >
              💳 ยืนยันเรียกเก็บเงิน
            </h3>

            <div
              style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '1rem',
                lineHeight: '1.6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ผู้ใหญ่ ({session.adult_count} ท่าน × 289):</span>
                <span>{session.adult_count * 289} บาท</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>เด็ก ({session.child_count} ท่าน × 145):</span>
                <span>{session.child_count * 145} บาท</span>
              </div>
              <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  color: '#e11d48',
                }}
              >
                <span>ยอดสุทธิ:</span>
                <span>{totalPrice.toLocaleString()} บาท</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={closingSession}
                onClick={() => setShowPaymentModal(false)}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={closingSession}
                onClick={handleConfirmPayment}
                style={{
                  flex: 1,
                  padding: '0.8rem',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: closingSession ? 'not-allowed' : 'pointer',
                }}
              >
                {closingSession ? 'กำลังปิด...' : 'ยืนยันชำระเงิน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
