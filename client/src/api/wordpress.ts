import axios from 'axios';

// WordPress REST API client
const wordpress = axios.create({
  baseURL: 'https://brolabentertainment.com/wp-json/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface WordPressPage {
  id: number;
  date: string;
  slug: string;
  status: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  featured_media: number;
}

export interface WordPressPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
  };
  excerpt: {
    rendered: string;
  };
  featured_media: number;
  categories: number[];
  tags: number[];
}

export interface WordPressMedia {
  id: number;
  source_url: string;
  alt_text: string;
  media_details: {
    width: number;
    height: number;
    sizes: {
      [key: string]: {
        source_url: string;
        width: number;
        height: number;
      };
    };
  };
}

// Get all published pages
export async function getPages(): Promise<WordPressPage[]> {
  try {
    const response = await wordpress.get('/wp/v2/pages', {
      params: {
        per_page: 100,
        status: 'publish',
        _embed: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching pages:', error);
    throw new Error('Failed to fetch pages from WordPress');
  }
}

// Get a specific page by slug
export async function getPageBySlug(slug: string): Promise<WordPressPage | null> {
  try {
    const response = await wordpress.get('/wp/v2/pages', {
      params: {
        slug: slug,
        status: 'publish',
        _embed: true
      }
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching page ${slug}:`, error);
    return null;
  }
}

// Get a specific post by slug
export async function getPostBySlug(slug: string): Promise<WordPressPost | null> {
  try {
    const response = await wordpress.get('/wp/v2/posts', {
      params: {
        slug: slug,
        status: 'publish',
        _embed: true
      }
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    return null;
  } catch (error) {
    console.error(`Error fetching post ${slug}:`, error);
    return null;
  }
}

// Get all published posts
export async function getPosts(page: number = 1, perPage: number = 10): Promise<WordPressPost[]> {
  try {
    const response = await wordpress.get('/wp/v2/posts', {
      params: {
        page: page,
        per_page: perPage,
        status: 'publish',
        _embed: true
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw new Error('Failed to fetch posts from WordPress');
  }
}

// Get media by ID
export async function getMedia(id: number): Promise<WordPressMedia | null> {
  try {
    const response = await wordpress.get(`/wp/v2/media/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching media ${id}:`, error);
    return null;
  }
}

export default wordpress;