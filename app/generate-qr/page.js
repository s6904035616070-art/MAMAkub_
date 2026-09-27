'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function GenerateQRPage() {
  // Form State
  const [tableNumber, setTableNumber] = useState('')
  const [adultCount, setAdultCount] = useState(1)
  const [childCount, setChildCount] = useState(0)

  // Status & UI State
  const [loading, setLoading] = useState(false)
  const [activeSession, setActiveSession] = useState(null) // session ที่เปิดค้างอยู่
  const [createdSession, setCreatedSession] = useState(null) // session ใหม่ที่สร้างสำเร็จ
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // 1. กดปุ่มเปิดโต๊ะ
  const handleOpenTable = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const trimmedTable = tableNumber.trim()
    if (!trimmedTable) {
      setErrorMsg('กรุณากรอกเลขโต๊ะ')
      setLoading(false)
      return
    }

    try {
      // เช็กก่อนว่ามี session status = 'open' ของโต๊ะนี้อยู่แล้วหรือไม่
      const { data: existingSessions, error: checkError } = await supabase
        .from('sessions')
        .select('*')
        .eq('table_number', trimmedTable)
        .eq('status', 'open')

      if (checkError) throw checkError

      if (existingSessions && existingSessions.length > 0) {
        // มี session ค้างอยู่ -> แสดงกล่องเตือน
        setActiveSession(existingSessions[0])
        setLoading(false)
        return
      }

      // ถ้าไม่มี session ค้างอยู่ -> Insert session ใหม่
      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            table_number: trimmedTable,
            adult_count: Number(adultCount),
            child_count: Number(childCount),
            status: 'open',
          },
        ])
        .select()
        .single()

      if (insertError) throw insertError

      // สร้างสำเร็จ
      setCreatedSession(newSession)
      setActiveSession(null)
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถดำเนินการได้'))
    } finally {
      setLoading(false)
    }
  }

  // คำนวณระยะเวลาเป็นนาทีจาก created_at ถึงเวลาปัจจุบัน
  const calculateElapsedMinutes = (createdAt) => {
    if (!createdAt) return 0
    const start = new Date(createdAt).getTime()
    const now = new Date().getTime()
    const diffMs = now - start
    const diffMins = Math.floor(diffMs / (1000 * 60))
    return diffMins < 0 ? 0 : diffMins
  }

  // 2. ยืนยันปิดโต๊ะเดิม
  const handleConfirmCloseOldSession = async () => {
    if (!activeSession) return
    setLoading(true)
    setErrorMsg('')

    try {
      // Update ให้ status = 'closed' เฉพาะแถวนั้น และเช็กว่ายังคงเป็น 'open' อยู่
      const { data, error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', activeSession.id)
        .eq('status', 'open')
        .select()

      if (error) throw error

      if (!data || data.length === 0) {
        setErrorMsg('ไม่สามารถปิดได้ เนื่องจาก Session อาจถูกปิดไปแล้ว')
      } else {
        // ปิดสำเร็จ -> ปิด modal, ล้างกล่องเตือน กลับไปฟอร์มเดิม (คงค่าที่กรอกไว้)
        setShowConfirmModal(false)
        setActiveSession(null)
      }
    } catch (err) {
      setErrorMsg('ปิดโต๊ะเดิมไม่สำเร็จ: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // คัดลอกลิงก์ไปยังคลิปบอร์ด
  const handleCopyLink = (url) => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ล้างค่าเมื่อต้องการเปิดโต๊ะใหม่ถัดไป
  const handleResetForm = () => {
    setCreatedSession(null)
    setActiveSession(null)
    setTableNumber('')
    setAdultCount(1)
    setChildCount(0)
    setErrorMsg('')
  }

  // สร้าง URL สั่งอาหารและ QR URL
  const originUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const orderUrl = createdSession ? `${originUrl}/order/${createdSession.table_number}` : ''
  const qrCodeUrl = orderUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(orderUrl)}`
    : ''

  return (
    <main
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '1.5rem',
        fontFamily: 'sans-serif',
        color: '#1f2937',
      }}
    >
      {/* Header Navigation */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            color: '#2563eb',
            fontSize: '1.1rem',
            fontWeight: 'bold',
          }}
        >
          ← กลับหน้าหลัก
        </Link>
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        📱 เปิดโต๊ะสั่งอาหาร
      </h1>

      {/* ข้อความแจ้งเตือน Error ทั่วไป */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: '8px',
            border: '1px solid #fca5a5',
            fontWeight: 'bold',
            fontSize: '1.1rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* CASE 1: แสดง QR Code เมื่อสร้าง Session ใหม่สำเร็จ */}
      {createdSession ? (
        <div
          style={{
            textAlign: 'center',
            background: '#f9fafb',
            border: '2px solid #22c55e',
            padding: '2rem 1.5rem',
            borderRadius: '16px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              background: '#dcfce7',
              color: '#15803d',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              fontSize: '1rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
            }}
          >
            ✓ เปิดโต๊ะสำเร็จ
          </div>

          <h2 style={{ fontSize: '2.2rem', margin: '0.5rem 0' }}>
            โต๊ะ {createdSession.table_number}
          </h2>

          <p
            style={{
              fontSize: '1.3rem',
              color: '#374151',
              fontWeight: 'bold',
              marginBottom: '1.5rem',
            }}
          >
            ผู้ใหญ่ {createdSession.adult_count} ท่าน · เด็ก {createdSession.child_count} ท่าน
          </p>

          {/* รูป QR Code */}
          <div
            style={{
              background: '#fff',
              padding: '1rem',
              display: 'inline-block',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            <img
              src={qrCodeUrl}
              alt={`QR Code โต๊ะ ${createdSession.table_number}`}
              width="260"
              height="260"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>

          {/* ลิงก์เต็มและปุ่มคัดลอก */}
          <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.95rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              ลิงก์สำหรับสั่งอาหาร:
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#fff',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
              }}
            >
              <input
                type="text"
                readOnly
                value={orderUrl}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  color: '#1d4ed8',
                  fontWeight: '500',
                  background: 'transparent',
                }}
              />
              <button
                type="button"
                onClick={() => handleCopyLink(orderUrl)}
                style={{
                  padding: '0.5rem 0.8rem',
                  background: copied ? '#16a34a' : '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ คัดลอกแล้ว' : 'คัดลอกลิงก์'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetForm}
            style={{
              marginTop: '2rem',
              width: '100%',
              padding: '1rem',
              background: '#4b5563',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            + เปิดโต๊ะใหม่
          </button>
        </div>
      ) : (
        /* CASE 2: ฟอร์มกรอกข้อมูล / กล่องเตือน */
        <div>
          {/* กล่องเตือนเมื่อโต๊ะมี Session เปิดค้างอยู่แล้ว */}
          {activeSession && (
            <div
              style={{
                background: '#fff7ed',
                border: '2px solid #f97316',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div
                style={{
                  color: '#c2410c',
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                }}
              >
                ⚠️ โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร กรุณาปิดออเดอร์เดิมก่อน
              </div>
              <p style={{ margin: '0.5rem 0', fontSize: '1rem', color: '#4b5563' }}>
                โต๊ะที่ {activeSession.table_number} มี Session สถานะ 'open' เปิดค้างไว้
              </p>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  padding: '0.85rem',
                  background: '#ea580c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ปิดออเดอร์เดิม
              </button>
            </div>
          )}

          {/* ฟอร์มกรอกเปิดโต๊ะ */}
          <form
            onSubmit={handleOpenTable}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div>
              <label
                htmlFor="table_number"
                style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
              >
                เลขโต๊ะ:
              </label>
              <input
                id="table_number"
                type="number"
                min="1"
                required
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="เช่น 7"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1.3rem',
                  borderRadius: '8px',
                  border: '1px solid #9ca3af',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="adult_count"
                style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
              >
                จำนวนผู้ใหญ่:
              </label>
              <input
                id="adult_count"
                type="number"
                min="1"
                required
                value={adultCount}
                onChange={(e) => setAdultCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1.3rem',
                  borderRadius: '8px',
                  border: '1px solid #9ca3af',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                htmlFor="child_count"
                style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}
              >
                จำนวนเด็ก:
              </label>
              <input
                id="child_count"
                type="number"
                min="0"
                required
                value={childCount}
                onChange={(e) => setChildCount(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontSize: '1.3rem',
                  borderRadius: '8px',
                  border: '1px solid #9ca3af',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                padding: '1rem',
                background: loading ? '#9ca3af' : '#e11d48',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.3rem',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.3)',
              }}
            >
              {loading ? 'กำลังตรวจสอบ...' : 'เปิดโต๊ะ'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Modal ยืนยันปิดโต๊ะเดิม */}
      {showConfirmModal && activeSession && (
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
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '450px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '2px solid #ef4444',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem 0',
                color: '#dc2626',
                fontSize: '1.5rem',
                textAlign: 'center',
              }}
            >
              ⚠️ ยืนยันปิด Session เดิม
            </h3>

            <div
              style={{
                background: '#f9fafb',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                fontSize: '1.1rem',
                lineHeight: '1.6',
              }}
            >
              <div>
                <strong>โต๊ะที่:</strong> {activeSession.table_number}
              </div>
              <div>
                <strong>จำนวนลูกค้า:</strong> ผู้ใหญ่ {activeSession.adult_count} ท่าน / เด็ก{' '}
                {activeSession.child_count} ท่าน
              </div>
              <div style={{ marginTop: '0.5rem', color: '#b91c1c', fontWeight: 'bold' }}>
                ⏱️ เปิดมาแล้ว {calculateElapsedMinutes(activeSession.created_at)} นาที
              </div>
            </div>

            <p style={{ fontSize: '1rem', color: '#4b5563', marginBottom: '1.5rem' }}>
              การปิดโต๊ะเดิมจะเปลี่ยนสถานะออเดอร์เดิมเป็น 'closed' คุณแน่ใจหรือไม่?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowConfirmModal(false)}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmCloseOldSession}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
