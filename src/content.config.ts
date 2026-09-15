import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import site from "../config/site.json";

const slugsCategorias = site.categorias.map((c) => c.slug) as [string, ...string[]];

// Cada notícia é um .md escrito pelo robot (robot/publicar.mjs).
const noticias = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/noticias" }),
  schema: z.object({
    titulo: z.string(),
    lead: z.string(),
    categoria: z.enum(slugsCategorias),
    tags: z.array(z.string()).default([]),
    importancia: z.number(),
    destaque: z.boolean().default(false),
    data: z.coerce.date(),
    fontes: z.array(z.object({ nome: z.string(), url: z.string() })),
    imagem: z.object({ url: z.string(), miniatura: z.string(), credito: z.string(), link: z.string() }).optional(),
  }),
});

export const collections = { noticias };
