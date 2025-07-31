import request from 'supertest';
import { app } from '../server/app';

describe('Schema Markup API', () => {
  describe('GET /api/schema/organization', () => {
    it('should return organization schema markup', async () => {
      const response = await request(app)
        .get('/api/schema/organization')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/ld+json');
      
      const schema = JSON.parse(response.text);
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('BroLab Entertainment');
      expect(schema.url).toBeDefined();
    });
  });

  describe('GET /api/schema/beats-list', () => {
    it('should return beats list schema markup', async () => {
      const response = await request(app)
        .get('/api/schema/beats-list')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/ld+json');
      
      const schema = JSON.parse(response.text);
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('MusicAlbum');
      expect(schema.name).toBe('BroLab Beats Collection');
      expect(schema.byArtist).toBeDefined();
      expect(schema.offers).toBeDefined();
    });
  });

  describe('GET /api/schema/beat/:id', () => {
    it('should return beat schema markup for valid ID', async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app)
        .get('/api/schema/beats-list')
        .expect(200);
      
      const listSchema = JSON.parse(listResponse.text);
      if (listSchema.tracks && listSchema.tracks.length > 0) {
        const validBeatId = listSchema.tracks[0].url.split('/').pop();
        
        const response = await request(app)
          .get(`/api/schema/beat/${validBeatId}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('application/ld+json');
        
        const schema = JSON.parse(response.text);
        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBe('MusicRecording');
        expect(schema.name).toBeDefined();
        expect(schema.genre).toBeDefined();
        expect(schema.byArtist).toBeDefined();
        expect(schema.additionalProperty).toBeDefined();
      } else {
        // Skip test if no products available
        console.log('No products available for testing');
      }
    });

    it('should return 404 for invalid beat ID', async () => {
      const response = await request(app)
        .get('/api/schema/beat/999999')
        .expect(404);

      expect(response.body.error).toBe('Beat not found');
    });
  });

  describe('Schema Markup Structure', () => {
    it('should include required MusicRecording properties', async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app)
        .get('/api/schema/beats-list')
        .expect(200);
      
      const listSchema = JSON.parse(listResponse.text);
      if (listSchema.tracks && listSchema.tracks.length > 0) {
        const validBeatId = listSchema.tracks[0].url.split('/').pop();
        
        const response = await request(app)
          .get(`/api/schema/beat/${validBeatId}`)
          .expect(200);

        const schema = JSON.parse(response.text);
        
        // Required properties
        expect(schema['@context']).toBe('https://schema.org');
        expect(schema['@type']).toBe('MusicRecording');
        expect(schema.name).toBeDefined();
        expect(schema.url).toBeDefined();
        
        // Music-specific properties
        expect(schema.genre).toBeDefined();
        expect(schema.byArtist).toBeDefined();
        expect(schema.byArtist['@type']).toBe('MusicGroup');
        
        // Additional properties for beats
        expect(schema.additionalProperty).toBeDefined();
        expect(Array.isArray(schema.additionalProperty)).toBe(true);
        
        // Check for BPM property
        const bpmProperty = schema.additionalProperty.find((prop: any) => prop.name === 'BPM');
        expect(bpmProperty).toBeDefined();
        expect(bpmProperty['@type']).toBe('PropertyValue');
      } else {
        // Skip test if no products available
        console.log('No products available for testing');
      }
    });

    it('should include offers when available', async () => {
      // First, get a list of products to find a valid ID
      const listResponse = await request(app)
        .get('/api/schema/beats-list')
        .expect(200);
      
      const listSchema = JSON.parse(listResponse.text);
      if (listSchema.tracks && listSchema.tracks.length > 0) {
        const validBeatId = listSchema.tracks[0].url.split('/').pop();
        
        const response = await request(app)
          .get(`/api/schema/beat/${validBeatId}`)
          .expect(200);

        const schema = JSON.parse(response.text);
        
        if (schema.offers) {
          expect(schema.offers['@type']).toBe('Offer');
          expect(schema.offers.priceCurrency).toBe('USD');
          expect(schema.offers.availability).toBe('https://schema.org/InStock');
          expect(schema.offers.seller).toBeDefined();
          expect(schema.offers.seller.name).toBe('BroLab Entertainment');
        }
      } else {
        // Skip test if no products available
        console.log('No products available for testing');
      }
    });
  });

  describe('Cache Headers', () => {
    it('should include appropriate cache headers', async () => {
      const response = await request(app)
        .get('/api/schema/organization')
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age=');
    });
  });
}); 