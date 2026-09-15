import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const raiz = fileURLToPath(new URL("..", import.meta.url));
const ler = (ficheiro) => readFileSync(new URL(`../${ficheiro}`, import.meta.url), "utf8");

export const RAIZ = raiz;
export const site = JSON.parse(ler("config/site.json"));
export const robot = parse(ler("config/robot.yaml"));
export const fontes = parse(ler("config/fontes.yaml")).fontes.filter((f) => f.ativa !== false);
export const linhaEditorial = ler("config/linha-editorial.md");
export const categorias = site.categorias.map((c) => c.slug);
