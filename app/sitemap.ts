import type { MetadataRoute } from "next";

const baseUrl = "https://homenageando.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/faq`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contato`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacidade`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/termos`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}