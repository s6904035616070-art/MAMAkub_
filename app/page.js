import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        fontFamily: "Arial, sans-serif",
        padding: "24px"
      }}
    >
      <h1>MAMAkub</h1>

      <p>ระบบสั่งอาหารร้านมาม่าเกาหลี</p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center"
        }}
      >
        <Link
          href="/generate-qr"
          style={{
            padding: "12px 20px",
            border: "1px solid #333",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#333"
          }}
        >
          Generate QR
        </Link>

        <Link
          href="/kitchen"
          style={{
            padding: "12px 20px",
            border: "1px solid #333",
            borderRadius: "8px",
            textDecoration: "none",
            color: "#333"
          }}
        >
          Kitchen
        </Link>
      </div>
    </main>
  );
}
