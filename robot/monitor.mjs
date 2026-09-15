import Parser from "rss-parser";
import { descarregarTexto } from "./http.mjs";

const parser = new Parser();

// Alguns feeds (Record, CM, Negócios) escapam o CDATA, que chega aqui como texto literal.
const limparTexto = (texto = "") =>
  texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Lê todos os feeds e devolve os itens novos (não vistos e dentro da idade máxima).
export async function lerFontes(fontes, { vistos, maxPorFonte, idadeMaximaHoras }) {
  const limite = Date.now() - idadeMaximaHoras * 3600_000;
  const itens = [];

  const resultados = await Promise.allSettled(
    fontes.map(async (fonte) => {
      const xml = await descarregarTexto(fonte.rss);
      const feed = await parser.parseString(xml);
      return feed.items.slice(0, maxPorFonte).map((item) => ({ fonte, item }));
    }),
  );

  resultados.forEach((resultado, i) => {
    if (resultado.status === "rejected") {
      console.warn(`⚠ ${fontes[i].nome}: ${resultado.reason.message}`);
      return;
    }
    for (const { fonte, item } of resultado.value) {
      const url = item.link?.trim();
      if (!url || vistos.has(url)) continue;
      const data = item.isoDate ? new Date(item.isoDate) : new Date();
      if (data.getTime() < limite) continue;
      itens.push({
        id: String(itens.length + 1),
        url,
        fonte: fonte.nome,
        categoriaSugerida: fonte.categoria,
        titulo: limparTexto(item.title),
        resumo: limparTexto(item.contentSnippet ?? item.content ?? item.summary).slice(0, 600),
        data: data.toISOString(),
      });
    }
  });

  return itens;
}
