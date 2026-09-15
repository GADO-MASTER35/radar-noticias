import Parser from "rss-parser";
import { descarregarTexto } from "./http.mjs";

const parser = new Parser();
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

// Os feeds RSS só guardam as últimas horas. Para dias anteriores usamos a pesquisa do Google News
// por site e por dia, que devolve as manchetes reais (título, fonte e hora) de cada publicação.
export async function manchetesDoDia(fontes, dia, { maxPorFonte = 40 } = {}) {
  const seguinte = new Date(`${dia}T00:00:00Z`);
  seguinte.setUTCDate(seguinte.getUTCDate() + 1);
  const ate = seguinte.toISOString().slice(0, 10);
  const itens = [];

  for (const fonte of fontes.filter((f) => f.site)) {
    const url = new URL("https://news.google.com/rss/search");
    url.search = new URLSearchParams({
      q: `site:${fonte.site} after:${dia} before:${ate}`,
      hl: "pt-PT",
      gl: "PT",
      ceid: "PT:pt-150",
    });
    try {
      const feed = await parser.parseString(await descarregarTexto(url.href));
      for (const item of feed.items.slice(0, maxPorFonte)) {
        const titulo = item.title?.replace(/\s+-\s+[^-]+$/, "").trim(); // remove " - Nome da fonte"
        if (!titulo) continue;
        itens.push({
          id: String(itens.length + 1),
          fonte: fonte.nome,
          site: fonte.site,
          categoriaSugerida: fonte.categoria,
          titulo,
          data: item.isoDate ?? `${dia}T12:00:00Z`,
        });
      }
    } catch (erro) {
      console.warn(`⚠ ${fonte.nome} (${dia}): ${erro.message}`);
    }
    await pausa(700); // não sobrecarregar o serviço
  }
  return itens;
}
