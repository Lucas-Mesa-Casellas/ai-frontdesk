import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://lmcagents.app", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://lmcagents.app/login", lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
