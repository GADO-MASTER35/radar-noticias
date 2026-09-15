import { robot, fontes } from "./config.mjs";
import { carregarEstado, guardarEstado } from "./estado.mjs";
import { lerFontes } from "./monitor.mjs";
import { extrairArtigo } from "./extrair.mjs";
import { triar, redigir } from "./claude.mjs";
import { criarSlug, publicar } from "./publicar.mjs";
import { buscarImagem } from "./imagem.mjs";

// --teste: não usa git nem guarda o estado; escreve no máximo 2 notícias em src/content/noticias.
const teste = process.argv.includes("--teste");
const { filtro } = robot;

const estado = carregarEstado();
const itens = await lerFontes(fontes, {
  vistos: estado.vistos,
  maxPorFonte: filtro.max_itens_por_fonte,
  idadeMaximaHoras: filtro.idade_maxima_horas,
});
console.log(`📡 ${fontes.length} fontes · ${itens.length} itens novos`);
if (!itens.length) process.exit(0);

if (!process.env.ANTHROPIC_API_KEY) {
  itens.slice(0, 30).forEach((i) => console.log(`  - [${i.fonte}] ${i.titulo}`));
  console.log("\nSem ANTHROPIC_API_KEY: parei antes da triagem.");
  process.exit(0);
}

// 1. Triagem (em lotes, para respostas curtas mesmo quando há centenas de itens novos)
const LOTE = 40;
const triados = [];
for (let i = 0; i < itens.length; i += LOTE) {
  triados.push(...(await triar(itens.slice(i, i + LOTE), estado.historias)));
}
const porId = new Map(itens.map((i) => [i.id, i]));
const agora = new Date().toISOString();

// 2. Agrupar por acontecimento e escolher os mais importantes
const grupos = new Map();
for (const t of triados) {
  const item = porId.get(t.id);
  if (!item) continue;
  if (t.importancia < filtro.importancia_minima || t.ja_publicada) {
    estado.vistos.set(item.url, agora); // rejeitado: não voltar a avaliar
    continue;
  }
  const grupo = grupos.get(t.historia) ?? { categoria: t.categoria, importancia: 0, fontes: [] };
  grupo.importancia = Math.max(grupo.importancia, t.importancia);
  grupo.fontes.push(item);
  grupos.set(t.historia, grupo);
}

const limite = teste ? Math.min(2, filtro.max_artigos_por_execucao) : filtro.max_artigos_por_execucao;
const escolhidos = [...grupos.values()].sort((a, b) => b.importancia - a.importancia).slice(0, limite);
console.log(`🧠 Triagem: ${grupos.size} acontecimentos relevantes, a escrever ${escolhidos.length}`);

// 3. Redação
const noticias = [];
const fotosUsadas = new Set();
for (const grupo of escolhidos) {
  const fontesGrupo = grupo.fontes.slice(0, 3);
  for (const fonte of fontesGrupo) fonte.texto = await extrairArtigo(fonte.url);

  let artigo;
  try {
    artigo = await redigir({ categoria: grupo.categoria, fontes: fontesGrupo });
  } catch (erro) {
    console.warn(`⚠ Falha ao redigir "${grupo.fontes[0].titulo}": ${erro.message}`);
    continue; // não marca como visto: volta a tentar na próxima execução
  }
  grupo.fontes.forEach((f) => estado.vistos.set(f.url, agora));
  if (!artigo) continue;
  const imagem = await buscarImagem(artigo.pesquisa_imagem, fotosUsadas);

  const noticia = {
    id: criarSlug(artigo.titulo, agora),
    titulo: artigo.titulo,
    lead: artigo.lead,
    categoria: grupo.categoria,
    tags: artigo.tags,
    importancia: grupo.importancia,
    destaque: grupo.importancia >= 9,
    data: agora,
    fontes: grupo.fontes.map((f) => ({ nome: f.fonte, url: f.url })),
    ...(imagem && { imagem }),
    corpo: artigo.corpo,
  };
  noticias.push(noticia);
  estado.historias.push({ id: noticia.id, titulo: noticia.titulo, categoria: noticia.categoria, data: agora });
  console.log(`✍  [${noticia.categoria} ${noticia.importancia}] ${noticia.titulo}`);
}

// 4. Publicação
publicar(noticias, { teste });
if (!teste) guardarEstado(estado);
console.log(`✅ ${noticias.length} notícia(s) ${teste ? "escritas localmente" : "enviadas"}`);
