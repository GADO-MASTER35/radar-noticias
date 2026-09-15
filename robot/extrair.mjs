import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { descarregarTexto } from "./http.mjs";

// Texto limpo do artigo original, para o Claude ter os factos completos.
// Os artigos noticiosos raramente passam deste tamanho; o limite só protege contra páginas anómalas.
const MAX_CARACTERES = 15000;

// Data de publicação lida da página (metadados JSON-LD/OpenGraph ou data no URL). null se não for possível confirmar.
export async function dataPublicacao(url) {
  const noUrl = url.match(/\/(20\d{2})\/(\d{2})\/(\d{2})\//);
  if (noUrl) return `${noUrl[1]}-${noUrl[2]}-${noUrl[3]}`;
  try {
    const html = await descarregarTexto(url);
    const encontrada =
      html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/)?.[1] ??
      html.match(/article:published_time"\s+content="(\d{4}-\d{2}-\d{2})/)?.[1] ??
      html.match(/content="(\d{4}-\d{2}-\d{2})[^"]*"\s+(?:property|name)="article:published_time"/)?.[1];
    return encontrada ?? null;
  } catch {
    return null;
  }
}

export async function extrairArtigo(url) {
  try {
    const html = await descarregarTexto(url);
    const { document } = parseHTML(html);
    const artigo = new Readability(document).parse();
    const texto = artigo?.textContent?.replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
    return texto ? texto.slice(0, MAX_CARACTERES) : null;
  } catch (erro) {
    console.warn(`⚠ Não foi possível extrair ${url}: ${erro.message}`);
    return null;
  }
}
