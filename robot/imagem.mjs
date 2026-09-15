// Foto ilustrativa com licença gratuita (Pexels). Sem PEXELS_API_KEY, a notícia fica sem imagem
// e o site mostra um fundo com a cor da secção. Não usamos fotos das fontes: têm direitos de autor.
export async function buscarImagem(pesquisa, usadas) {
  const chave = process.env.PEXELS_API_KEY;
  if (!chave || !pesquisa) return null;

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.search = new URLSearchParams({ query: pesquisa, orientation: "landscape", per_page: "10" });
    const resposta = await fetch(url, { headers: { Authorization: chave }, signal: AbortSignal.timeout(10000) });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);

    const { photos = [] } = await resposta.json();
    // Evita repetir a mesma foto em notícias próximas.
    const foto = photos.find((p) => !usadas.has(p.id)) ?? photos[0];
    if (!foto) return null;
    usadas.add(foto.id);

    return {
      url: foto.src.landscape,
      miniatura: foto.src.medium,
      credito: foto.photographer,
      link: foto.url,
    };
  } catch (erro) {
    console.warn(`⚠ Imagem "${pesquisa}": ${erro.message}`);
    return null;
  }
}
