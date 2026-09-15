// Modo semana: preenche o site com as notícias mais importantes dos últimos dias.
//   npm run robot:semana -- --dias 7 --por-dia 8
//   npm run robot:semana -- --so-listar      (só mostra as manchetes encontradas, sem usar a API)
// O progresso fica em robot-estado/arquivo.json: se parar a meio, voltar a correr continua de onde ficou.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fontes, RAIZ } from "./config.mjs";
import { manchetesDoDia } from "./arquivo.mjs";
import { pesquisar, redigir, selecionarDia } from "./claude.mjs";
import { carregarEstado, guardarEstado } from "./estado.mjs";
import { buscarImagem } from "./imagem.mjs";
import { criarSlug, escreverFicheiro } from "./publicar.mjs";

const argumento = (nome, padrao) => {
  const i = process.argv.indexOf(`--${nome}`);
  return i === -1 ? padrao : Number(process.argv[i + 1]);
};
const DIAS = argumento("dias", 7);
const POR_DIA = argumento("por-dia", 8);
const SO_LISTAR = process.argv.includes("--so-listar");

const FICHEIRO_PROGRESSO = join(RAIZ, "robot-estado", "arquivo.json");
const progresso = existsSync(FICHEIRO_PROGRESSO) ? JSON.parse(readFileSync(FICHEIRO_PROGRESSO, "utf8")) : {};
const guardarProgresso = () => {
  mkdirSync(join(RAIZ, "robot-estado"), { recursive: true });
  writeFileSync(FICHEIRO_PROGRESSO, JSON.stringify(progresso, null, 1));
};

if (!SO_LISTAR && !process.env.ANTHROPIC_API_KEY) {
  console.error("Falta ANTHROPIC_API_KEY (no ficheiro .env ou no terminal).");
  process.exit(1);
}

const dominioDe = (site) => site.split("/")[0];
const dominios = [...new Set(fontes.filter((f) => f.site).map((f) => dominioDe(f.site)))];
const nomeDaFonte = (url, nomeSugerido) => {
  const host = new URL(url).hostname.replace(/^www\./, "");
  const fonte = fontes.find((f) => f.site && (host === dominioDe(f.site) || host.endsWith(`.${dominioDe(f.site)}`)));
  return fonte?.nome ?? nomeSugerido;
};

// Do dia mais antigo até hoje (o robot normal não repete: as histórias ficam registadas no estado).
const hoje = new Date();
const dias = Array.from({ length: DIAS }, (_, i) => {
  const d = new Date(hoje);
  d.setUTCDate(d.getUTCDate() - (DIAS - 1 - i));
  return d.toISOString().slice(0, 10);
});

const estado = carregarEstado();
const fotosUsadas = new Set();
const jaEscolhidas = Object.values(progresso).flatMap((p) => p.historias?.map((h) => h.titulo) ?? []);
let escritas = 0;

for (const dia of dias) {
  progresso[dia] ??= {};
  const registo = progresso[dia];

  // 1. Manchetes do dia + seleção (feita uma só vez por dia)
  if (!registo.historias) {
    const itens = await manchetesDoDia(fontes, dia);
    console.log(`\n📅 ${dia}: ${itens.length} manchetes`);
    if (SO_LISTAR) {
      itens.slice(0, 15).forEach((i) => console.log(`   [${i.fonte}] ${i.titulo}`));
      continue;
    }
    if (!itens.length) continue;

    const selecao = await selecionarDia({ dia, itens, quantidade: POR_DIA, jaEscolhidas: jaEscolhidas.slice(-60) });
    const porId = new Map(itens.map((i) => [i.id, i]));
    registo.historias = selecao.map((h) => ({
      ...h,
      manchetes: h.ids.map((id) => porId.get(id)).filter(Boolean),
      feita: false,
    }));
    jaEscolhidas.push(...selecao.map((h) => h.titulo));
    guardarProgresso();
    registo.historias.forEach((h) => console.log(`   ${h.importancia}  [${h.categoria}] ${h.titulo}`));
  } else {
    console.log(`\n📅 ${dia}: seleção já feita (${registo.historias.length} acontecimentos)`);
  }

  // 2. Pesquisa + redação de cada acontecimento
  for (const historia of registo.historias) {
    if (historia.feita || !historia.manchetes.length) continue;
    try {
      const pesquisa = await pesquisar({ dia, historia: historia.titulo, manchetes: historia.manchetes, dominios });
      if (!pesquisa) {
        console.warn(`   ⚠ Sem artigos originais legíveis: ${historia.titulo}`);
        historia.feita = "sem-fontes";
        guardarProgresso();
        continue;
      }
      const fontesNoticia = pesquisa.fontes.map((f) => ({ nome: nomeDaFonte(f.url, f.nome), url: f.url }));
      const artigo = await redigir({
        categoria: historia.categoria,
        fontes: [{ fonte: fontesNoticia.map((f) => f.nome).join(", "), url: fontesNoticia[0].url, titulo: historia.titulo, texto: pesquisa.factos }],
      });
      if (!artigo) {
        historia.feita = "recusada";
        guardarProgresso();
        continue;
      }

      // Hora original: a manchete mais antiga sobre o acontecimento.
      const data = historia.manchetes.map((m) => m.data).sort()[0];
      const imagem = await buscarImagem(artigo.pesquisa_imagem, fotosUsadas);
      const noticia = {
        id: criarSlug(artigo.titulo, data),
        titulo: artigo.titulo,
        lead: artigo.lead,
        categoria: historia.categoria,
        tags: artigo.tags,
        importancia: historia.importancia,
        destaque: historia.importancia >= 9,
        data,
        fontes: fontesNoticia,
        ...(imagem && { imagem }),
        corpo: artigo.corpo,
      };
      escreverFicheiro(noticia);
      estado.historias.push({ id: noticia.id, titulo: noticia.titulo, categoria: noticia.categoria, data: noticia.data });
      historia.feita = noticia.id;
      guardarProgresso();
      escritas++;
      console.log(`   ✍  ${noticia.titulo}`);
    } catch (erro) {
      console.warn(`   ⚠ Erro em "${historia.titulo}": ${erro.message}`);
    }
  }
}

if (!SO_LISTAR) guardarEstado(estado);
console.log(`\n✅ ${escritas} notícia(s) escritas em src/content/noticias`);
