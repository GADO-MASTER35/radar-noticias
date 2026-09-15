import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify } from "yaml";
import { RAIZ, robot, site } from "./config.mjs";

const PASTA_NOTICIAS = join(RAIZ, "src", "content", "noticias");
const git = (...args) => execFileSync("git", args, { cwd: RAIZ, stdio: "inherit" });

export function criarSlug(titulo, data) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)
    .replace(/-$/, "");
  return `${data.slice(0, 10)}-${base}`;
}

export function escreverFicheiro(noticia) {
  const { id, corpo, ...frontmatter } = noticia;
  writeFileSync(join(PASTA_NOTICIAS, `${id}.md`), `---\n${stringify(frontmatter)}---\n\n${corpo.trim()}\n`);
}

function descricaoPR(noticia) {
  const nomeCategoria = site.categorias.find((c) => c.slug === noticia.categoria)?.nome;
  return [
    `**${nomeCategoria}** · importância ${noticia.importancia}/10`,
    "",
    `> ${noticia.lead}`,
    "",
    "**Fontes**",
    ...noticia.fontes.map((f) => `- [${f.nome}](${f.url})`),
    "",
    "✅ **Merge** para publicar · ❌ **Close** para rejeitar · ✏️ edita o ficheiro neste PR para corrigir",
  ].join("\n");
}

function vaiParaRevisao(noticia) {
  const { modo, automatico_categorias = [] } = robot.publicacao;
  if (modo === "automatico") return false;
  if (modo === "misto") return !automatico_categorias.includes(noticia.categoria);
  return true;
}

export function publicar(noticias, { teste }) {
  if (teste) {
    noticias.forEach(escreverFicheiro);
    return;
  }

  // Revisão: um branch + Pull Request por notícia, criados a partir do main.
  for (const noticia of noticias.filter(vaiParaRevisao)) {
    const branch = `noticia/${noticia.id}`;
    git("switch", "-c", branch);
    escreverFicheiro(noticia);
    git("add", PASTA_NOTICIAS);
    git("commit", "-m", `Notícia: ${noticia.titulo}`);
    git("push", "-u", "origin", branch);
    execFileSync(
      "gh",
      ["pr", "create", "--base", "main", "--head", branch, "--title", noticia.titulo, "--body", descricaoPR(noticia)],
      { cwd: RAIZ, stdio: "inherit" },
    );
    git("switch", "main");
  }

  // Automático: um só commit no main com as restantes.
  const diretas = noticias.filter((n) => !vaiParaRevisao(n));
  if (diretas.length) {
    diretas.forEach(escreverFicheiro);
    git("add", PASTA_NOTICIAS);
    git("commit", "-m", `Robot: ${diretas.length} notícia(s) publicada(s)`);
    git("pull", "--rebase", "origin", "main");
    git("push", "origin", "HEAD:main");
  }
}
