import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "شمسك الخاص",
    short_name: "شمسك",
    description: "مراقبة الطاقة الشمسية المنزلية",
    start_url: "/",
    display: "standalone",
    lang: "ar",
    background_color: "#f3f4f6",
    theme_color: "#2563eb",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
