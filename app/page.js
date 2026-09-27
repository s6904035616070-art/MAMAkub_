import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>🍜 MAMAkub</h1>
      <p>ระบบสั่งอาหารร้านมาม่าเกาหลี</p>
      <hr style={{ margin: '1.5rem 0' }} />
      <nav>
        <ul style={{ display: 'flex', gap: '1rem', listStyle: 'none', padding: 0 }}>
          <li>
            <Link 
              href="/generate-qr" 
              style={{ padding: '0.5rem 1rem', background: '#0070f3', color: '#fff', borderRadius: '5px', textDecoration: 'none' }}
            >
              สร้าง QR Code (/generate-qr)
            </Link>
          </li>
          <li>
            <Link 
              href="/kitchen" 
              style={{ padding: '0.5rem 1rem', background: '#17c964', color: '#fff', borderRadius: '5px', textDecoration: 'none' }}
            >
              หน้าห้องครัว (/kitchen)
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
