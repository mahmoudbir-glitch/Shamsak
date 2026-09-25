import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "شمسك",
    short_name: "شمسك",
    description: "إدارة ومراقبة الطاقة الشمسية في منزلك",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#f3f4f6",
    theme_color: "#2563eb",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
