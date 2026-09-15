import rss from "@astrojs/rss";
import site from "../../config/site.json";
import { todasNoticias, urlNoticia } from "../lib/noticias";

export async function GET(context) {
  const noticias = await todasNoticias();
  return rss({
    title: site.nome,
    description: site.slogan,
    site: context.site,
    items: noticias.slice(0, 50).map((n) => ({
      title: n.data.titulo,
      description: n.data.lead,
      pubDate: n.data.data,
      link: urlNoticia(n),
      categories: [n.data.categoria],
    })),
    customData: `<language>${site.idioma}</language>`,
  });
}
