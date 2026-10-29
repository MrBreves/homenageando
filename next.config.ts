import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.182"],

  outputFileTracingIncludes: {
    "/*": [
      "./tools/ffmpeg/linux-x64/ffmpeg",
      "./tools/ffmpeg/linux-x64/ffprobe",
      "./tools/ffmpeg/linux-x64/GPLv3.txt",
    ],
  },

  outputFileTracingExcludes: {
    "/*": [
      "./tools/ffmpeg/bin/**/*",
      "./tools/ffmpeg/doc/**/*",
      "./tools/ffmpeg/presets/**/*",
    ],
  },
};

export default nextConfig;
