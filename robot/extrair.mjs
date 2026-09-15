import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { descarregarTexto } from "./http.mjs";

// Texto limpo do artigo original, para o Claude ter os factos completos.
// Os artigos noticiosos raramente passam deste tamanho; o limite só protege contra páginas anómalas.
const MAX_CARACTERES = 15000;

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
