import { MetadataRoute } from "next";

const published = new Date("2026-11-04");

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://elfmatch.com";

  return [
    { url: baseUrl, lastModified: published, changeFrequency: "weekly", priority: 1 },
    {
      url: `${baseUrl}/features`,
      lastModified: published,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: published,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/family-and-office`,
      lastModified: published,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/secret-santa-with-exclusions`,
      lastModified: published,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: published,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: published,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: published,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
