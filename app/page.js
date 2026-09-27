import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🍜 MAMAkub</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>ระบบสั่งอาหารร้านมาม่าเกาหลี</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Link 
          href="/generate-qr" 
          style={{ 
            padding: '1rem', 
            background: '#e11d48', 
            color: '#fff', 
            borderRadius: '8px', 
            textDecoration: 'none',
            fontWeight: 'bold' 
          }}
        >
          📱 สร้าง QR Code เปิดโต๊ะ (สำหรับพนักงาน)
        </Link>
        <Link 
          href="/kitchen" 
          style={{ 
            padding: '1rem', 
            background: '#2563eb', 
            color: '#fff', 
            borderRadius: '8px', 
            textDecoration: 'none',
            fontWeight: 'bold' 
          }}
        >
          👨‍🍳 หน้าจอห้องครัว (Kitchen)
        </Link>
      </div>
    </main>
  )
}
