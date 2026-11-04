import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard/",
          "/api/",
          "/auth/",
          "/invite/",
          "/sso-callback",
        ],
      },
    ],
    sitemap: "https://elfmatch.com/sitemap.xml",
  };
}
