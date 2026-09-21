import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ModernLMS",
    short_name: "ModernLMS",
    description: "A fast LMS with an AI layer that acts on course material.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#212121",
    theme_color: "#b8ff1a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
