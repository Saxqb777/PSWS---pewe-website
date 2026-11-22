/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // a payment screenshot or a photo comes with the form; the phone makes it small first
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
