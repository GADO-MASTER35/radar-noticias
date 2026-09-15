const USER_AGENT = "Mozilla/5.0 (compatible; RadarNoticiasBot/1.0)";

// Descarrega texto respeitando o charset (vários sites PT ainda usam ISO-8859-1).
export async function descarregarTexto(url, timeoutMs = 15000) {
  const resposta = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);

  const bytes = new Uint8Array(await resposta.arrayBuffer());
  const inicio = new TextDecoder("ascii").decode(bytes.slice(0, 1024));
  const charset =
    resposta.headers.get("content-type")?.match(/charset=([\w-]+)/i)?.[1] ??
    inicio.match(/encoding=["']([\w-]+)["']/i)?.[1] ??
    inicio.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    "utf-8";

  try {
    return new TextDecoder(charset.toLowerCase()).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
