/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: '4mb' },
  },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/Banks-Family-Reunion-Guide.pdf',
        headers: [{ key: 'Content-Disposition', value: 'attachment; filename="Banks-Family-Reunion-Guide.pdf"' }],
      },
    ];
  },
};

export default nextConfig;
