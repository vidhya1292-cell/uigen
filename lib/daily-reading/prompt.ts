export function buildGenerationPrompt(date: string, feeds: Record<string, string>, excludeLinks: string[] = []): string {
  const LIVE_RSS_DATA_BLOCK = `
=== WORLD NEWS ===
${feeds.world}

=== INDIA NEWS ===
${feeds.india}

=== INDIA MARKETS ===
${feeds.markets}

=== AI NEWS ===
${feeds.ai}

=== DEEP READ SOURCES ===
${feeds.deepRead}

=== COMPANY NEWS (for Startup & Public Company of the Day) ===
${feeds.companyNews}
`.trim()

  const exclusionBlock = excludeLinks.length > 0
    ? `\nALREADY USED — DO NOT REPEAT THESE STORIES (these URLs appeared in previous briefings):\n${excludeLinks.map(u => `- ${u}`).join('\n')}\n`
    : ''

  return `You are a world-class business and technology analyst producing a premium daily briefing for a sophisticated reader — a founder, investor, or senior operator who reads widely, thinks in systems, and has zero patience for fluff.

Today's date: ${date}
${exclusionBlock}
${LIVE_RSS_DATA_BLOCK}

Your task: Using ONLY the above live data as your source material, generate the daily briefing JSON.

IMPORTANT SOURCE RULES:
- Use the live RSS data as the single source of truth
- Pick the most significant/interesting story from each category
- Use actual RSS item links for sources (not invented URLs)
- Only pick articles published within the last 7 days — check the Date field
- For deepRead, pick the MOST RECENTLY PUBLISHED analytically rich piece
- Do NOT invent stories — only summarize what is in the feed data
- If a category has no feed data, output headline "No live data available"

STRICT CATEGORY BOUNDARIES:
- WORLD: international geopolitics, foreign policy, global conflicts only. No Indian domestic news.
- INDIA: India domestic economy, Indian government policy, Indian business only. Not world news that mentions India in passing.
- INDIA MARKETS: Sensex, Nifty, Indian stocks, RBI, rupee, Indian bond yields only. NOT global markets.
- AI: AI/ML/LLM/robotics only. Not general tech.
- DEEP READ: REJECT link digests, weekly roundups, "dose of optimism", podcast summaries. PICK single-topic analytical essays only.

CONTENT QUALITY RULES:

whatsHappening cards:
- headline: max 15 words, punchy and specific
- summary: 60-90 words. What happened, why it matters, what to watch. Include specific numbers, names, percentages.

deepRead:
- 4-6 analytical paragraphs, each moving the argument forward
- Specific companies, numbers, historical analogies
- No filler sentences

startupOfDay / publicCompanyOfDay:
- whatTheyDo: 80-120 words. Key metrics (ARR, valuation, last round, users). Specific.
- fundamentalChange: the structural shift that makes this company necessary NOW. Not generic "digitization".
- competitors: 3-5 named competitors with revenue/growth/weakness
- unspokenTruth: the insight customers never say out loud but drives buying decisions
- assumptions: 3 specific market assumptions + what breaks each one
- bullCase: genuine bull case AND where it breaks — honest about both

Style: Stratechery × Morgan Housel × The Information.
Never: "game-changer", "revolutionary", "disruptive", "leveraging", "synergy", "robust".
Always: specific numbers, named companies, historical analogies, second-order consequences.

OUTPUT: valid JSON matching this TypeScript interface. No markdown fences. No text outside the JSON.

interface DailyReadingContent {
  date: string; // YYYY-MM-DD
  whatsHappening: {
    world:   { headline: string; summary: string; sources: { label: string; url: string }[] };
    india:   { headline: string; summary: string; sources: { label: string; url: string }[] };
    markets: { headline: string; summary: string; sources: { label: string; url: string }[] };
    ai:      { headline: string; summary: string; sources: { label: string; url: string }[] };
  };
  deepRead: {
    title: string;
    author: string;
    publication: string;
    paragraphs: string[]; // 4-6 paragraphs, 80-150 words each
    readLink: string;
  };
  startupOfDay: {
    name: string; tagline: string;
    whatTheyDo: string; fundamentalChange: string; competitors: string;
    unspokenTruth: string; assumptions: string; bullCase: string;
    sources: { label: string; url: string }[];
  };
  publicCompanyOfDay: {
    name: string; tagline: string;
    whatTheyDo: string; fundamentalChange: string; competitors: string;
    unspokenTruth: string; assumptions: string; bullCase: string;
    sources: { label: string; url: string }[];
  };
}`
}
