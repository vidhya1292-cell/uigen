/**
 * Autoresearch experiment runner for daily reading prompt
 * Usage: npx tsx run-experiment.ts <prompt-file> <experiment-id> <description>
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Load .env.local if present
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

const RUNS_PER_EXPERIMENT = 5
const RESULTS_TSV = path.join(__dirname, 'results.tsv')
const RESULTS_JSON = path.join(__dirname, 'results.json')
const CHANGELOG = path.join(__dirname, 'changelog.md')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── RSS Fetcher (inlined) ─────────────────────────────────────────────────

const RSS_FEEDS: Record<string, string[]> = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://foreignpolicy.com/feed/',
  ],
  india: [
    'https://economictimes.indiatimes.com/news/economy/rss.cms',
    'https://economictimes.indiatimes.com/news/india/rss.cms',
    'https://www.thehindu.com/business/Economy/feeder/default.rss',
    'https://www.livemint.com/rss/economy',
  ],
  markets: [
    'https://www.thehindubusinessline.com/markets/feeder/default.rss',
    'https://www.thehindubusinessline.com/markets/stock-markets/feeder/default.rss',
    'https://economictimes.indiatimes.com/news/economy/policy/rss.cms',
  ],
  ai: [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
    'https://www.technologyreview.com/feed/',
  ],
  deepRead: [
    'https://www.ben-evans.com/benedictevans/rss.xml',
    'https://www.thegeneralist.co/feed',
    'https://every.to/chain-of-thought/feed',
    'https://www.lennysnewsletter.com/feed',
    'https://hnrss.org/best',
  ],
  companyNews: [
    'https://techcrunch.com/feed/',
    'https://techcrunch.com/category/startups/feed/',
    'https://inc42.com/feed/',
    'https://economictimes.indiatimes.com/industry/rss.cms',
  ],
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DailyReading/1.0)' },
    })
    if (!res.ok) return ''
    return await res.text()
  } catch { return '' }
  finally { clearTimeout(timeout) }
}

function extractItems(xml: string, maxItems = 5): string {
  const items: string[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
  let match
  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1]
    const title = (/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i.exec(block) ?? [])[1]
      ?? (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(block) ?? [])[1] ?? ''
    const link = (/<link>([\s\S]*?)<\/link>/i.exec(block) ?? [])[1] ?? ''
    const desc = (/<description[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i.exec(block) ?? [])[1]
      ?? (/<description[^>]*>([\s\S]*?)<\/description>/i.exec(block) ?? [])[1] ?? ''
    const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/i.exec(block) ?? [])[1] ?? ''
    const clean = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
    if (clean(title)) items.push(`Title: ${clean(title)}\nLink: ${clean(link)}\nDate: ${clean(pubDate)}\nSummary: ${clean(desc).slice(0, 300)}`)
  }
  return items.join('\n---\n')
}

async function fetchAllFeeds(): Promise<Record<string, string>> {
  console.log('  Fetching RSS feeds...')
  const results: Record<string, string> = {}
  await Promise.all(
    Object.entries(RSS_FEEDS).map(async ([category, urls]) => {
      const feedTexts = await Promise.all(urls.map(fetchFeed))
      const combined = feedTexts.map((xml, i) => {
        if (!xml) return ''
        const items = extractItems(xml)
        return items ? `[Source: ${urls[i]}]\n${items}` : ''
      }).filter(Boolean).join('\n\n')
      results[category] = combined || 'No data available'
    })
  )
  return results
}

// ─── Scorer ───────────────────────────────────────────────────────────────

const EVALS = [
  {
    id: 1,
    name: 'Headline specificity',
    question: 'Does each of the 4 whatsHappening headlines include at least one specific name, number, percentage, or proper noun (not vague phrases like "Markets rise" or "AI advances")?',
  },
  {
    id: 2,
    name: 'Summary depth',
    question: 'Do the whatsHappening summaries each answer all three: what happened, why it matters, and what to watch next?',
  },
  {
    id: 3,
    name: 'No banned words',
    question: 'Is the entire output completely free of these words: game-changer, revolutionary, disruptive, leveraging, synergy, robust?',
  },
  {
    id: 4,
    name: 'Deep Read is essay',
    question: 'Is the Deep Read section a single-topic analytical essay (not a digest, list, weekly roundup, or podcast summary)?',
  },
  {
    id: 5,
    name: 'Company section has metrics',
    question: 'Does the whatTheyDo field for both startupOfDay and publicCompanyOfDay include at least one specific metric (ARR, valuation, revenue, user count, growth rate, or funding round size)?',
  },
  {
    id: 6,
    name: 'Category boundaries',
    question: 'Are all category boundaries respected: World card has no Indian domestic news, India card has no world news, Markets card covers only Indian markets (Sensex/Nifty/RBI/rupee), AI card covers only AI/ML topics?',
  },
]

async function scoreOutput(jsonContent: string): Promise<{ scores: boolean[]; reasoning: string }> {
  const evalQuestions = EVALS.map(e => `${e.id}. ${e.name}: ${e.question}`).join('\n')
  const prompt = `You are evaluating a daily news briefing JSON output against quality criteria. Answer each question with ONLY "YES" or "NO" on a new line. No explanations.

OUTPUT TO EVALUATE:
${jsonContent.slice(0, 6000)}

QUESTIONS (answer YES or NO for each, one per line):
${evalQuestions}`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = msg.content.filter(b => b.type === 'text').map(b => (b as {type:'text';text:string}).text).join('')
  const lines = text.trim().split('\n').map(l => l.trim())
  const scores = EVALS.map((_, i) => {
    const line = lines[i] ?? ''
    return line.toUpperCase().includes('YES')
  })

  return { scores, reasoning: text }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function runExperiment(promptFile: string, experimentId: number, description: string) {
  console.log(`\n=== Experiment ${experimentId}: ${description} ===`)

  // Load prompt builder from file
  const promptModule = await import(path.resolve(promptFile))
  const buildGenerationPrompt: (date: string, feeds: Record<string, string>) => string = promptModule.buildGenerationPrompt

  // Fetch feeds once, reuse across all runs
  const feeds = await fetchAllFeeds()
  const today = new Date().toISOString().split('T')[0]

  const allScores: boolean[][] = []
  const failedOutputs: string[] = []

  for (let run = 1; run <= RUNS_PER_EXPERIMENT; run++) {
    console.log(`  Run ${run}/${RUNS_PER_EXPERIMENT}...`)
    try {
      const prompt = buildGenerationPrompt(today, feeds)
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      })
      const rawText = msg.content.filter(b => b.type === 'text').map(b => (b as {type:'text';text:string}).text).join('')
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText.trim()

      const { scores, reasoning } = await scoreOutput(jsonStr)
      allScores.push(scores)

      const passingCount = scores.filter(Boolean).length
      const failingEvals = EVALS.filter((_, i) => !scores[i]).map(e => e.name)
      console.log(`    Score: ${passingCount}/${EVALS.length} | Failing: ${failingEvals.join(', ') || 'none'}`)

      if (failingEvals.length > 0) {
        failedOutputs.push(`Run ${run} failures (${failingEvals.join(', ')}):\n${reasoning}`)
      }
    } catch (err) {
      console.error(`    Run ${run} failed:`, err)
      allScores.push(EVALS.map(() => false))
    }
  }

  // Aggregate scores
  const totalScore = allScores.reduce((sum, runScores) => sum + runScores.filter(Boolean).length, 0)
  const maxScore = RUNS_PER_EXPERIMENT * EVALS.length
  const passRate = ((totalScore / maxScore) * 100).toFixed(1)

  // Per-eval breakdown
  const evalBreakdown = EVALS.map((e, i) => ({
    name: e.name,
    pass_count: allScores.filter(runScores => runScores[i]).length,
    total: RUNS_PER_EXPERIMENT,
  }))

  console.log(`\n  TOTAL: ${totalScore}/${maxScore} (${passRate}%)`)
  console.log('  Eval breakdown:')
  evalBreakdown.forEach(e => console.log(`    ${e.name}: ${e.pass_count}/${e.total}`))

  return { totalScore, maxScore, passRate, evalBreakdown, failedOutputs }
}

async function updateResults(
  experimentId: number,
  score: number,
  maxScore: number,
  passRate: string,
  status: 'baseline' | 'keep' | 'discard',
  description: string,
  evalBreakdown: { name: string; pass_count: number; total: number }[]
) {
  // TSV
  if (!fs.existsSync(RESULTS_TSV)) {
    fs.writeFileSync(RESULTS_TSV, 'experiment\tscore\tmax_score\tpass_rate\tstatus\tdescription\n')
  }
  fs.appendFileSync(RESULTS_TSV, `${experimentId}\t${score}\t${maxScore}\t${passRate}%\t${status}\t${description}\n`)

  // JSON
  let data: Record<string, unknown> = {
    skill_name: 'daily-reading-prompt',
    status: 'running',
    current_experiment: experimentId,
    baseline_score: 0,
    best_score: 0,
    experiments: [],
    eval_breakdown: evalBreakdown,
  }
  if (fs.existsSync(RESULTS_JSON)) {
    try { data = JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8')) } catch {}
  }
  const experiments = (data.experiments as unknown[]) ?? []
  experiments.push({
    id: experimentId,
    score,
    max_score: maxScore,
    pass_rate: parseFloat(passRate),
    status,
    description,
  })
  if (status === 'baseline') data.baseline_score = parseFloat(passRate)
  data.best_score = Math.max(...experiments.map((e: unknown) => (e as {pass_rate: number}).pass_rate))
  data.experiments = experiments
  data.eval_breakdown = evalBreakdown
  data.current_experiment = experimentId
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(data, null, 2))
}

// CLI
const [, , promptFile, expIdStr, ...descParts] = process.argv
const experimentId = parseInt(expIdStr ?? '0')
const description = descParts.join(' ') || 'no description'

if (!promptFile) {
  console.error('Usage: npx tsx run-experiment.ts <prompt-file.ts> <experiment-id> <description>')
  process.exit(1)
}

runExperiment(promptFile, experimentId, description).then(({ totalScore, maxScore, passRate, evalBreakdown, failedOutputs }) => {
  console.log('\nFailed output notes:')
  failedOutputs.forEach(f => console.log(' -', f.slice(0, 200)))
  // Write to a temp file so the orchestrator can read results
  fs.writeFileSync(
    path.join(__dirname, 'last-result.json'),
    JSON.stringify({ experimentId, totalScore, maxScore, passRate, evalBreakdown, failedOutputs })
  )
  return { totalScore, maxScore, passRate, evalBreakdown }
}).catch(console.error)
