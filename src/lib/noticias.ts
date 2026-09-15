import { getCollection, type CollectionEntry } from "astro:content";
import site from "../../config/site.json";

export type Noticia = CollectionEntry<"noticias">;

export async function todasNoticias(): Promise<Noticia[]> {
  const noticias = await getCollection("noticias");
  return noticias.sort((a, b) => b.data.data.getTime() - a.data.data.getTime());
}

export const nomeCategoria = (slug: string) => site.categorias.find((c) => c.slug === slug)?.nome ?? slug;

export const urlNoticia = (n: Noticia) => `/${n.data.categoria}/${n.id}/`;

export const slugTag = (tag: string) =>
  tag
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const fuso = { timeZone: "Europe/Lisbon" } as const;

export const dataCurta = (d: Date) =>
  new Intl.DateTimeFormat("pt-PT", { ...fuso, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);

export const dataLonga = (d: Date) =>
  new Intl.DateTimeFormat("pt-PT", { ...fuso, dateStyle: "full", timeStyle: "short" }).format(d);

// Manchete: destaque mais recente das últimas 24h; senão, a notícia mais importante das últimas 24h.
export function escolherManchete(noticias: Noticia[]): Noticia | undefined {
  const dia = noticias.filter((n) => Date.now() - n.data.data.getTime() < 86400_000);
  const base = dia.length ? dia : noticias;
  return base.find((n) => n.data.destaque) ?? [...base].sort((a, b) => b.data.importancia - a.data.importancia)[0];
}

// "Em destaque hoje": as mais importantes das últimas 24h (ou de sempre, se o dia estiver vazio).
export function maisImportantes(noticias: Noticia[]): Noticia[] {
  const dia = noticias.filter((n) => Date.now() - n.data.data.getTime() < 86400_000);
  return [...(dia.length ? dia : noticias)].sort(
    (a, b) => b.data.importancia - a.data.importancia || b.data.data.getTime() - a.data.data.getTime(),
  );
}
