import request from 'supertest';
import { app } from '../server/app';

describe('Sitemap API', () => {
  describe('GET /sitemap.xml', () => {
    it('should return valid sitemap XML', async () => {
      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      expect(response.headers['cache-control']).toContain('public');
      
      const xml = response.text;
      
      // Vérifier la structure XML de base
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"');
      
      // Vérifier la présence d'URLs importantes
      expect(xml).toContain('<loc>https://brolabentertainment.com/</loc>');
      expect(xml).toContain('<loc>https://brolabentertainment.com/shop</loc>');
      
      // Vérifier la structure des URLs
      expect(xml).toMatch(/<url>\s*<loc>.*<\/loc>/);
    });

    it('should include proper XML structure for each URL', async () => {
      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      const xml = response.text;
      
      // Vérifier que chaque URL a les bonnes balises
      const urlMatches = xml.match(/<url>/g);
      const locMatches = xml.match(/<loc>/g);
      const lastmodMatches = xml.match(/<lastmod>/g);
      const changefreqMatches = xml.match(/<changefreq>/g);
      const priorityMatches = xml.match(/<priority>/g);
      
      expect(urlMatches).toBeDefined();
      expect(locMatches).toBeDefined();
      expect(lastmodMatches).toBeDefined();
      expect(changefreqMatches).toBeDefined();
      expect(priorityMatches).toBeDefined();
      
      // Vérifier que le nombre d'URLs correspond
      expect(urlMatches?.length).toBe(locMatches?.length);
    });
  });

  describe('GET /robots.txt', () => {
    it('should return valid robots.txt', async () => {
      const response = await request(app)
        .get('/robots.txt')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.headers['cache-control']).toContain('public');
      
      const robotsTxt = response.text;
      
      // Vérifier le contenu de base
      expect(robotsTxt).toContain('User-agent: *');
      expect(robotsTxt).toContain('Allow: /');
      expect(robotsTxt).toContain('Sitemap: https://brolabentertainment.com/sitemap.xml');
      
      // Vérifier les directives importantes
      expect(robotsTxt).toContain('Disallow: /admin/');
      expect(robotsTxt).toContain('Disallow: /api/');
      expect(robotsTxt).toContain('Allow: /shop');
      expect(robotsTxt).toContain('Allow: /product/');
    });
  });

  describe('GET /sitemap-index.xml', () => {
    it('should return valid sitemap index XML', async () => {
      const response = await request(app)
        .get('/sitemap-index.xml')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      
      const xml = response.text;
      
      // Vérifier la structure XML de base
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      
      // Vérifier la présence des sitemaps
      expect(xml).toContain('/sitemap.xml');
      expect(xml).toContain('/sitemap-beats.xml');
      expect(xml).toContain('/sitemap-categories.xml');
    });
  });

  describe('GET /sitemap-beats.xml', () => {
    it('should return beats-only sitemap XML', async () => {
      const response = await request(app)
        .get('/sitemap-beats.xml')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/xml');
      
      const xml = response.text;
      
      // Vérifier la structure XML de base
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
      
      // Vérifier que c'est un sitemap de beats (pas de pages statiques)
      expect(xml).not.toContain('<loc>https://brolabentertainment.com/about</loc>');
      expect(xml).not.toContain('<loc>https://brolabentertainment.com/contact</loc>');
    });
  });

  describe('Sitemap Content Validation', () => {
    it('should include proper priorities for different page types', async () => {
      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      const xml = response.text;
      
      // Vérifier les priorités SEO
      expect(xml).toContain('<priority>1</priority>'); // Page d'accueil
      expect(xml).toContain('<priority>0.9</priority>'); // Shop
      expect(xml).toContain('<priority>0.8</priority>'); // Beats et catégories
    });

    it('should include proper change frequencies', async () => {
      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      const xml = response.text;
      
      // Vérifier les fréquences de changement
      expect(xml).toContain('<changefreq>daily</changefreq>'); // Pages principales
      expect(xml).toContain('<changefreq>weekly</changefreq>'); // Beats et catégories
      expect(xml).toContain('<changefreq>monthly</changefreq>'); // Pages statiques
    });

    it('should include lastmod dates', async () => {
      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      const xml = response.text;
      
      // Vérifier que les dates lastmod sont présentes
      const lastmodMatches = xml.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g);
      expect(lastmodMatches).toBeDefined();
      expect(lastmodMatches?.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Headers', () => {
    it('should include appropriate cache headers for sitemap', async () => {
      const response = await request(app)
        .get('/sitemap.xml')
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=');
    });

    it('should include appropriate cache headers for robots.txt', async () => {
      const response = await request(app)
        .get('/robots.txt')
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=');
    });
  });
}); 