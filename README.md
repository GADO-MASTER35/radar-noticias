# Radar: portal de notícias atualizado pelo Claude

A cada 15 minutos, um robot lê os feeds RSS de 14 órgãos de comunicação portugueses. O Claude escolhe o que é importante, escreve uma notícia original e envia-a para o site.

```
GitHub Actions (a cada 15 min)
  └─ robot/index.mjs
       1. monitor.mjs    lê os RSS (config/fontes.yaml) e ignora links já vistos
       2. claude.mjs     triagem: importância 1–10, categoria, agrupa a mesma história de várias fontes
       3. extrair.mjs    vai buscar o texto completo das fontes
          claude.mjs     redação: título, lead, corpo e tags (config/linha-editorial.md)
       4. publicar.mjs   modo revisão → um Pull Request por notícia · modo automático → commit no main
Vercel: cada commit no main faz deploy do site (Astro)
```

## Estrutura

| Pasta/ficheiro | Para que serve |
|---|---|
| `config/site.json` | Nome, slogan, URL e categorias do site |
| `config/fontes.yaml` | Sites de referência (adicionar/remover fontes aqui) |
| `config/linha-editorial.md` | O que é importante, o que ignorar e como escrever. **É o "cérebro" editorial.** |
| `config/robot.yaml` | Modo de publicação, nota mínima, limites de custo e modelos |
| `robot/` | Código do robot (Node) |
| `src/` | Site Astro: home, secções, artigo, tags, RSS, sitemap |
| `src/content/noticias/` | As notícias publicadas (um `.md` cada) |
| `.github/workflows/robot.yml` | Agenda do robot |

## Pôr no ar (uma vez)

1. **Chave da API do Claude**: cria-a em https://console.anthropic.com/ e define um limite de gastos mensal.
2. **GitHub**: cria um repositório (pode ser privado) e envia o projeto:
   ```bash
   git init -b main
   git add .
   git commit -m "Projeto inicial"
   git remote add origin https://github.com/<utilizador>/<repo>.git
   git push -u origin main
   ```
3. No repositório, em **Settings → Secrets and variables → Actions**, cria os segredos:
   - `ANTHROPIC_API_KEY`: obrigatório;
   - `PEXELS_API_KEY`: opcional mas recomendado, para as fotos. A chave é grátis em https://www.pexels.com/api/. Sem ela, as notícias aparecem com um fundo na cor da secção.
4. Em **Settings → Actions → General → Workflow permissions**:
   - escolhe *Read and write permissions*;
   - ativa *Allow GitHub Actions to create and approve pull requests*.
5. **Vercel**: https://vercel.com → *Add New Project* → importa o repositório. Deteta o Astro sozinho.
6. Atualiza o `url` em `config/site.json` com o domínio final.
7. No GitHub, abre **Actions → Robot de notícias → Run workflow** para a primeira execução.

## Rotina de revisão

Cada notícia chega como **Pull Request**, e a Vercel gera um link de pré-visualização.
- **Merge**: publica.
- **Close**: rejeita.
- Para corrigir, edita o ficheiro dentro do PR e depois faz Merge.

A app do GitHub no telemóvel serve para aprovar notícias em qualquer lado.

Quando confiares no robot, muda em `config/robot.yaml`:
- `modo: misto`: desporto, cultura e tecnologia publicam logo, o resto passa por revisão;
- `modo: automatico`: publica tudo sem revisão.

## Correr no teu PC

```bash
npm install
npm run dev
```
O primeiro comando instala as dependências. O segundo abre o site em http://localhost:4321.

Para testar o robot sem git (escreve até 2 notícias em `src/content/noticias`):
```bash
ANTHROPIC_API_KEY=sk-ant-... npm run robot:teste
```
Sem a chave, o robot só lista os itens novos que encontrou nos feeds.

## Preencher a semana (notícias antigas)

Os feeds RSS só guardam as últimas horas. Para dias anteriores, o modo semana:
1. vai buscar as manchetes reais de cada fonte, dia a dia, à pesquisa do Google News;
2. pede ao Claude que escolha os acontecimentos mais importantes de cada dia;
3. o Claude **pesquisa na web e lê os artigos originais** (só nos domínios das fontes);
4. escreve cada notícia com a **data e hora originais**.

```bash
npm run robot:semana -- --so-listar
```
Mostra as manchetes encontradas, sem gastar API.

```bash
npm run robot:semana -- --dias 1 --por-dia 3
```
Teste pequeno: 1 dia, 3 notícias.

```bash
npm run robot:semana -- --dias 7 --por-dia 8
```
Semana completa: cerca de 56 notícias.

O progresso fica em `robot-estado/arquivo.json`. Se parar a meio, basta correr o mesmo comando outra vez. Este modo usa pesquisa web e lê artigos inteiros, por isso gasta bastante mais por notícia do que o robot normal.

## Controlar custos

- `importancia_minima`: subir para 7 publica menos e gasta menos.
- `max_artigos_por_execucao`: teto de artigos a cada 15 minutos.
- `modelo_triagem: claude-haiku-4-5`: a triagem fica bastante mais barata.
- Define sempre um limite de gastos na consola da Anthropic.

## Design

O visual segue a linguagem dos grandes portais (G1, RTP, Euronews), com identidade própria:
- barra da marca, secções e faixa **Última hora** a passar;
- manchete grande com o título por cima da foto, e dois destaques ao lado;
- feed "Últimas notícias" com miniatura (estilo G1) e ranking "Em destaque hoje";
- banda verde própria para o **Desporto**;
- artigo com botões de partilha (WhatsApp, Facebook, X), foto com crédito e "Mais recentes" ao lado.

As cores e as fontes estão no topo de `src/styles/global.css` (`--marca`, `--acento`, cores por categoria). O nome e o slogan estão em `config/site.json`.

## Regras importantes

- **Direitos de autor**: o robot escreve texto próprio a partir dos factos, cita e liga para as fontes. Não mudes o prompt para copiar artigos. As fotos vêm do Pexels (licença gratuita), com crédito e a indicação "Imagem ilustrativa". Nunca uses fotografias das fontes.
- **Transparência**: o rodapé e a página `/sobre` indicam que as notícias são redigidas com apoio de IA.
- **Termos das fontes**: confirma que os termos de uso de cada site permitem este tipo de utilização dos feeds.
- O GitHub pausa workflows agendados em repositórios sem atividade durante 60 dias. Se o robot parar, reativa-o em *Actions*.
