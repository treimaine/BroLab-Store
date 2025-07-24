// WordPress Service Functions

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