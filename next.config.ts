import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next.js 16 defaults to [75] and silently coerces any other requested
    // quality down to it -- the homepage/login photos were being served at
    // 75% no matter what `quality` prop was passed until this was added.
    qualities: [75, 90],
  },
};

export default nextConfig;
