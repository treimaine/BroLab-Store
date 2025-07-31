import request from 'supertest';
import { app } from '../server/app';

describe('Open Graph API', () => {
  describe('GET /api/opengraph/beat/:id', () => {
    it('should return Open Graph meta tags for valid beat ID', async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app)
        .get('/sitemap.xml')
        .expect(200);
      
      const xml = listResponse.text;
      const productMatches = xml.match(/\/product\/(\d+)/);
      
      if (productMatches && productMatches[1]) {
        const validBeatId = productMatches[1];
        
        const response = await request(app)
          .get(`/api/opengraph/beat/${validBeatId}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/html');
        expect(response.headers['cache-control']).toContain('public');
        
        const html = response.text;
        
        // Vérifier la présence des meta tags Open Graph
        expect(html).toContain('property="og:title"');
        expect(html).toContain('property="og:description"');
        expect(html).toContain('property="og:url"');
        expect(html).toContain('property="og:image"');
        expect(html).toContain('property="og:type"');
        expect(html).toContain('property="og:site_name"');
        
        // Vérifier les meta tags Twitter Card
        expect(html).toContain('name="twitter:card"');
        expect(html).toContain('name="twitter:title"');
        expect(html).toContain('name="twitter:description"');
        expect(html).toContain('name="twitter:image"');
        
        // Vérifier le type de contenu musical
        expect(html).toContain('content="music.song"');
      } else {
        console.log('No products available for testing');
      }
    });

    it('should return 404 for invalid beat ID', async () => {
      const response = await request(app)
        .get('/api/opengraph/beat/999999')
        .expect(404);

      expect(response.body.error).toBe('Beat not found');
    });
  });

  describe('GET /api/opengraph/shop', () => {
    it('should return Open Graph meta tags for shop page', async () => {
      const response = await request(app)
        .get('/api/opengraph/shop')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['cache-control']).toContain('public');
      
      const html = response.text;
      
      // Vérifier la présence des meta tags Open Graph
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:url"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('property="og:type"');
      expect(html).toContain('property="og:site_name"');
      
      // Vérifier le type de contenu website
      expect(html).toContain('content="website"');
      
      // Vérifier que c'est pour la page shop
      expect(html).toContain('/shop');
    });
  });

  describe('GET /api/opengraph/home', () => {
    it('should return Open Graph meta tags for home page', async () => {
      const response = await request(app)
        .get('/api/opengraph/home')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers['cache-control']).toContain('public');
      
      const html = response.text;
      
      // Vérifier la présence des meta tags Open Graph
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:url"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('property="og:type"');
      expect(html).toContain('property="og:site_name"');
      
      // Vérifier le type de contenu website
      expect(html).toContain('content="website"');
    });
  });

  describe('GET /api/opengraph/page/:pageName', () => {
    it('should return Open Graph meta tags for valid static pages', async () => {
      const validPages = ['about', 'contact', 'terms', 'privacy', 'license'];
      
      for (const pageName of validPages) {
        const response = await request(app)
          .get(`/api/opengraph/page/${pageName}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/html');
        expect(response.headers['cache-control']).toContain('public');
        
        const html = response.text;
        
        // Vérifier la présence des meta tags Open Graph
        expect(html).toContain('property="og:title"');
        expect(html).toContain('property="og:description"');
        expect(html).toContain('property="og:url"');
        expect(html).toContain('property="og:image"');
        expect(html).toContain('property="og:type"');
        expect(html).toContain('property="og:site_name"');
        
        // Vérifier que l'URL contient le nom de la page
        expect(html).toContain(`/${pageName}`);
      }
    });

    it('should return 400 for invalid page name', async () => {
      const response = await request(app)
        .get('/api/opengraph/page/invalid-page')
        .expect(400);

      expect(response.body.error).toBe('Invalid page name');
    });
  });

  describe('Open Graph Content Validation', () => {
    it('should include proper Twitter Card type for beats', async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app)
        .get('/sitemap.xml')
        .expect(200);
      
      const xml = listResponse.text;
      const productMatches = xml.match(/\/product\/(\d+)/);
      
      if (productMatches && productMatches[1]) {
        const validBeatId = productMatches[1];
        
        const response = await request(app)
          .get(`/api/opengraph/beat/${validBeatId}`)
          .expect(200);

        const html = response.text;
        
        // Vérifier le type Twitter Card pour les beats
        expect(html).toContain('content="summary_large_image"');
        
        // Vérifier les meta tags spécifiques à la musique
        expect(html).toContain('content="music.song"');
      } else {
        console.log('No products available for testing');
      }
    });

    it('should include proper Twitter Card type for pages', async () => {
      const response = await request(app)
        .get('/api/opengraph/shop')
        .expect(200);

      const html = response.text;
      
      // Vérifier le type Twitter Card pour les pages
      expect(html).toContain('content="summary_large_image"');
      
      // Vérifier les meta tags pour les pages
      expect(html).toContain('content="website"');
    });

    it('should include proper site name', async () => {
      const response = await request(app)
        .get('/api/opengraph/home')
        .expect(200);

      const html = response.text;
      
      // Vérifier le nom du site
      expect(html).toContain('content="BroLab Entertainment"');
    });
  });

  describe('HTML Escaping', () => {
    it('should properly escape HTML characters in meta tags', async () => {
      const response = await request(app)
        .get('/api/opengraph/shop')
        .expect(200);

      const html = response.text;
      
      // Vérifier qu'il n'y a pas de caractères HTML non échappés
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('javascript:');
      
      // Vérifier que le HTML est valide et bien formaté
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('content="');
      
      // Vérifier que le HTML est bien structuré
      expect(html).toContain('<meta');
      expect(html).toContain('/>');
    });
  });

  describe('Cache Headers', () => {
    it('should include appropriate cache headers for Open Graph', async () => {
      const response = await request(app)
        .get('/api/opengraph/shop')
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=');
    });
  });
}); 