import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/auth/verify/"],
      },
    ],
    sitemap: "https://giftwhisper.online/sitemap.xml",
  };
}
