export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>QDS API Service</h1>
      <p>Vivo Documents Reader API</p>
      <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
        <li>POST /api/vivo-docs/read - 读取文档</li>
        <li>GET /api/vivo-docs/validate - 校验 Token</li>
        <li>GET /api/health - 健康检查</li>
      </ul>
    </main>
  )
}