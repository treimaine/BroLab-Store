// WordPress Service Functions

// Get WordPress products (beats)
export async function getWordPressProducts(params: any = {}) {
  try {
    const queryParams = new URLSearchParams({
      per_page: '100',
      status: 'publish',
      ...params
    });
    
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.WP_API_KEY ? `Bearer ${process.env.WP_API_KEY}` : ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status}`);
    }
    
    const posts = await response.json();
    
    // Transform WordPress posts to product format
    return posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      status: post.status,
      featured: post.featured,
      genre: post.meta?.genre || post.acf?.genre || 'Unknown',
      bpm: post.meta?.bpm || post.acf?.bpm || 0,
      key: post.meta?.key || post.acf?.key || '',
      mood: post.meta?.mood || post.acf?.mood || '',
      price: post.meta?.price || post.acf?.price || 0,
      audio_url: post.meta?.audio_url || post.acf?.audio_url || '',
      featured_media_url: post.featured_media_url || post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
      tags: post.tags || [],
      downloads: post.meta?.downloads || 0,
      views: post.meta?.views || 0,
      duration: post.meta?.duration || post.acf?.duration || 0,
      date_created: post.date,
      date_modified: post.modified
    }));
  } catch (error) {
    console.error('WordPress Products API Error:', error);
    return [];
  }
}

export async function fetchWPPosts(params: any = {}) {
  try {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?${queryParams}`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return await response.json();
  } catch (error) {
    console.error('WordPress Posts API Error:', error);
    return [];
  }
}

export async function fetchWPPostBySlug(slug: string) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/posts?slug=${slug}`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const posts = await response.json();
    return posts.length > 0 ? posts[0] : null;
  } catch (error) {
    console.error('WordPress Post API Error:', error);
    return null;
  }
}

export async function fetchWPPageBySlug(slug: string) {
  try {
    const response = await fetch(`${process.env.VITE_WP_URL}/pages?slug=${slug}`, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const pages = await response.json();
    return pages.length > 0 ? pages[0] : null;
  } catch (error) {
    console.error('WordPress Page API Error:', error);
    return null;
  }
}