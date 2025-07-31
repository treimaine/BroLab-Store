import type { BeatProduct } from '@shared/schema';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapConfig {
  baseUrl: string;
  includeImages?: boolean;
  includeCategories?: boolean;
  includeStaticPages?: boolean;
}

/**
 * Génère le sitemap XML pour tous les beats et pages
 * Basé sur les données WooCommerce avec priorité SEO
 */
export function generateSitemapXML(
  beats: BeatProduct[],
  categories: any[],
  config: SitemapConfig
): string {
  const { baseUrl, includeImages = true, includeCategories = true, includeStaticPages = true } = config;
  
  const urls: SitemapUrl[] = [];
  
  // Page d'accueil
  urls.push({
    loc: `${baseUrl}/`,
    changefreq: 'daily',
    priority: 1.0,
    lastmod: new Date().toISOString().split('T')[0]
  });
  
  // Page shop
  urls.push({
    loc: `${baseUrl}/shop`,
    changefreq: 'daily',
    priority: 0.9,
    lastmod: new Date().toISOString().split('T')[0]
  });
  
  // Pages statiques
  if (includeStaticPages) {
    const staticPages = [
      { path: '/about', priority: 0.7, changefreq: 'monthly' as const },
      { path: '/contact', priority: 0.6, changefreq: 'monthly' as const },
      { path: '/terms', priority: 0.3, changefreq: 'yearly' as const },
      { path: '/privacy', priority: 0.3, changefreq: 'yearly' as const },
      { path: '/license', priority: 0.5, changefreq: 'monthly' as const }
    ];
    
    staticPages.forEach(page => {
      urls.push({
        loc: `${baseUrl}${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority,
        lastmod: new Date().toISOString().split('T')[0]
      });
    });
  }
  
  // Catégories de beats
  if (includeCategories && categories.length > 0) {
    categories.forEach(category => {
      urls.push({
        loc: `${baseUrl}/shop?category=${encodeURIComponent(category.name)}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
      });
    });
  }
  
  // Beats individuels
  beats.forEach(beat => {
    const beatUrl: SitemapUrl = {
      loc: `${baseUrl}/product/${beat.id}`,
      changefreq: 'weekly',
      priority: 0.8,
      lastmod: (beat as any).updated_at ? new Date((beat as any).updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };
    
    urls.push(beatUrl);
  });
  
  // Générer le XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(url => {
  let urlElement = `  <url>
    <loc>${url.loc}</loc>`;
  
  if (url.lastmod) {
    urlElement += `\n    <lastmod>${url.lastmod}</lastmod>`;
  }
  
  if (url.changefreq) {
    urlElement += `\n    <changefreq>${url.changefreq}</changefreq>`;
  }
  
  if (url.priority) {
    urlElement += `\n    <priority>${url.priority}</priority>`;
  }
  
  // Ajouter les images pour les beats
       if (includeImages && url.loc.includes('/product/') && beats.length > 0) {
       const beatId = url.loc.split('/').pop();
       const beat = beats.find(b => b.id.toString() === beatId);
       
       if (beat && (beat as any).image_url) {
         urlElement += `\n    <image:image>
       <image:loc>${(beat as any).image_url}</image:loc>
       <image:title>${beat.title}</image:title>
       <image:caption>${beat.title} - ${beat.genre} beat by BroLab Entertainment</image:caption>
     </image:image>`;
       }
     }
  
  urlElement += `\n  </url>`;
  return urlElement;
}).join('\n')}
</urlset>`;
  
  return xml;
}

/**
 * Génère un sitemap index pour les gros sites
 */
export function generateSitemapIndex(baseUrl: string, sitemaps: string[]): string {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${baseUrl}${sitemap}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
  
  return xml;
}

/**
 * Génère un sitemap robots.txt
 */
export function generateRobotsTxt(baseUrl: string): string {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact

# Crawl delay (optional)
Crawl-delay: 1`;
} 