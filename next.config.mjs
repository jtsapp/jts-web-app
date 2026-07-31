/** @type {import('next').NextConfig} */
const nextConfig = {
  // Секреты читаются серверными route-handlers через process.env — в клиент
  // уходят только NEXT_PUBLIC_*.

  // Самодостаточный `.next/standalone` (сервер + только нужные node_modules)
  // для self-host в Docker — без этого Vercel-сборка тащит весь node_modules.
  output: 'standalone',
}

export default nextConfig
