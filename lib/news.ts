export type FifaNewsItem = {
  title: string;
  url: string;
  image?: string;
  excerpt?: string;
  date?: string;
};

const FIFA_NEWS_URL = "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/news";

export async function fetchFifaNews(): Promise<FifaNewsItem[]> {
  const response = await fetch(FIFA_NEWS_URL, {
    next: { revalidate: 3600 },
    headers: {
      "user-agent": "Aneeminen veikkauskisasivusto private friends contest"
    }
  });

  if (!response.ok) {
    throw new Error(`FIFA news fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const titleMatches = [...html.matchAll(/"title"\s*:\s*"([^"]+)"/g)]
    .map((match) => clean(match[1]))
    .filter((title) => title.length > 12 && !title.includes("FIFA World Cup 26™"));

  const uniqueTitles = [...new Set(titleMatches)].slice(0, 12);
  return uniqueTitles.map((title) => ({
    title,
    url: FIFA_NEWS_URL
  }));
}

function clean(value: string) {
  return value.replace(/\\u0026/g, "&").replace(/\\"/g, '"').trim();
}
