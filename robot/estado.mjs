import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RAIZ } from "./config.mjs";

// No GitHub Actions, esta pasta é o branch "robot-estado" (fora do site, para não gerar deploys).
const PASTA = join(RAIZ, "robot-estado");
const VISTOS = join(PASTA, "vistos.json");
const HISTORIAS = join(PASTA, "historias.json");

const lerJson = (ficheiro, padrao) =>
  existsSync(ficheiro) ? JSON.parse(readFileSync(ficheiro, "utf8")) : padrao;

export function carregarEstado() {
  return {
    vistos: new Map(Object.entries(lerJson(VISTOS, {}))),
    historias: lerJson(HISTORIAS, []),
  };
}

export function guardarEstado({ vistos, historias }) {
  const agora = Date.now();
  const recentes = (data, dias) => agora - new Date(data).getTime() < dias * 86400_000;

  mkdirSync(PASTA, { recursive: true });
  const vistosRecentes = Object.fromEntries([...vistos].filter(([, data]) => recentes(data, 7)));
  writeFileSync(VISTOS, JSON.stringify(vistosRecentes, null, 1));
  writeFileSync(HISTORIAS, JSON.stringify(historias.filter((h) => recentes(h.data, 3)), null, 1));
}
