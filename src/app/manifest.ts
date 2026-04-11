import type { MetadataRoute } from "next"

import {
  appDescription,
  appLauncherName,
  appTitle,
} from "@/app/app-metadata"
import { installIconThemeColor } from "@/app/install-icon"

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: installIconThemeColor,
    description: appDescription,
    display: "standalone",
    icons: [
      {
        purpose: "maskable",
        sizes: "192x192",
        src: "/icon-192",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icon-512",
        type: "image/png",
      },
    ],
    name: appTitle,
    short_name: appLauncherName,
    start_url: "/",
    theme_color: installIconThemeColor,
  }
}
