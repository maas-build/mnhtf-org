import * as cheerio from 'cheerio';

const paths = [
  { path: '/', localPath: '/' },
  { path: '/about', localPath: '/about-hoarding' },
  { path: '/board-members', localPath: '/board-members' },
  { path: '/contact', localPath: '/contact' },
  { path: '/directory', localPath: '/directory' },
  { path: '/education', localPath: '/education' },
  { path: '/events', localPath: '/events-and-calendar' },
  { path: '/for-people-who-hoard', localPath: '/for-people-who-hoard' },
  { path: '/for-property-managers', localPath: '/for-property-managers' },
  { path: '/membership', localPath: '/membership' },
  { path: '/partners', localPath: '/partners' },
  { path: '/resources', localPath: '/resources' },
  { path: '/ways-to-give', localPath: '/ways-to-give' }
];

async function fetchPageData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // We only want images and links from main content area if possible, but fallback to body
    const main = $('main').length ? $('main') : $('body');
    
    return {
      h1: $('h1').first().text().trim() || 'Missing H1',
      h2s: $('h2').map((_, el) => $(el).text().trim()).get(),
      imgs: $('img').map((_, el) => {
        const src = $(el).attr('src');
        return src ? src.split('/').pop() : '';
      }).get().filter(Boolean),
      links: $('a[href]').map((_, el) => $(el).text().trim()).get().filter(Boolean).slice(0, 20)
    };
  } catch (e) {
    return null;
  }
}

function compare(live, local) {
  if (!live && !local) return ["❌ Both live and local pages failed to load."];
  if (!local) return ["❌ Local page failed to load (404?)."];
  if (!live) return ["❌ Live page failed to load."];

  const diffs = [];

  // H1
  if (live.h1 === local.h1) {
    diffs.push(`✅ H1 matches: "${live.h1}"`);
  } else {
    diffs.push(`❌ H1 mismatch: Expected "${live.h1}", got "${local.h1}"`);
  }

  // H2s
  const missingH2s = live.h2s.filter(h2 => !local.h2s.includes(h2));
  if (missingH2s.length === 0) {
    diffs.push(`✅ Main headings (H2) mostly match.`);
  } else {
    diffs.push(`❌ Missing H2s: ${missingH2s.map(h => `"${h}"`).join(', ')}`);
  }

  // Images
  // Simplify image name matching because they might be optimized/hashed
  const liveImgsBase = live.imgs.map(i => i.split('.')[0].toLowerCase());
  const localImgsBase = local.imgs.map(i => i.split('.')[0].toLowerCase());
  
  const missingImgs = liveImgsBase.filter(i => !localImgsBase.some(l => l.includes(i) || i.includes(l)));
  if (missingImgs.length === 0) {
    diffs.push(`✅ Key images appear present.`);
  } else {
    diffs.push(`❌ Potentially missing images: ${live.imgs.filter(i => missingImgs.includes(i.split('.')[0].toLowerCase())).join(', ')}`);
  }

  // CTAs/Links
  const missingLinks = live.links.filter(l => !local.links.includes(l));
  // If too many missing, maybe structure changed. We just check if top CTAs exist.
  if (missingLinks.length <= 5) {
    diffs.push(`✅ Key CTAs/links present.`);
  } else {
    diffs.push(`❌ Some links/CTAs missing or text changed: ${missingLinks.slice(0, 5).join(', ')}...`);
  }

  return diffs;
}

async function run() {
  for (const p of paths) {
    console.log(`\n## Page: ${p.path}`);
    const liveUrl = `https://mnhtf.org${p.path}`;
    const localUrl = `http://localhost:4321${p.localPath}`;
    
    const liveData = await fetchPageData(liveUrl);
    const localData = await fetchPageData(localUrl);
    
    const diffs = compare(liveData, localData);
    diffs.forEach(d => console.log(`- ${d}`));
  }
}

run();
