/** @type {import('next').NextConfig} */
const nextConfig = {
  // Секреты читаются серверными route-handlers через process.env — в клиент
  // уходят только NEXT_PUBLIC_*.
}

export default nextConfig
