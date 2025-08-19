// Utility functions to extract real metadata from WooCommerce products
export const extractProductData = (product: any) => {
  // Extract genre from multiple sources
  const getGenre = () => {
    return (
      product.categories?.[0]?.name ||
      product.categories?.find((cat: any) => cat.name)?.name ||
      product.meta_data?.find((meta: any) => meta.key === "genre")?.value ||
      product.meta_data?.find((meta: any) => meta.key === "category")?.value ||
      product.meta_data?.find((meta: any) => meta.key === "style")?.value ||
      product.attributes?.find((attr: any) => attr.name === "Genre")?.options?.[0] ||
      product.attributes?.find((attr: any) => attr.name === "Style")?.options?.[0] ||
      ""
    );
  };

  // Extract BPM
  const getBPM = () => {
    return (
      product.bpm ||
      product.meta_data?.find((meta: any) => meta.key === "bpm")?.value ||
      product.meta_data?.find((meta: any) => meta.key === "BPM")?.value ||
      product.attributes?.find((attr: any) => attr.name === "BPM")?.options?.[0] ||
      ""
    );
  };

  // Extract duration
  const getDuration = () => {
    const duration = product.meta_data?.find((meta: any) => meta.key === "duration")?.value ||
                    product.meta_data?.find((meta: any) => meta.key === "length")?.value;
    return duration ? parseInt(duration) : undefined;
  };

  // Extract tags from multiple sources
  const getTags = () => {
    const tags = [];
    
    // From WooCommerce tags
    if (product.tags && Array.isArray(product.tags)) {
      tags.push(...product.tags.map((tag: any) => tag.name));
    }
    
    // From meta data
    const metaTags = product.meta_data?.find((meta: any) => meta.key === "tags")?.value;
    if (metaTags) {
      if (typeof metaTags === 'string') {
        tags.push(...metaTags.split(',').map((tag: string) => tag.trim()));
      } else if (Array.isArray(metaTags)) {
        tags.push(...metaTags);
      }
    }
    
    return tags.filter(Boolean);
  };

  // Extract price
  const getPrice = () => {
    return product.price ? parseFloat(product.price) : 0;
  };

  // Check if free
  const isFree = () => {
    return product.price === '0' || product.price === '' || product.price === 0 || product.is_free;
  };

  // Extract audio URL
  const getAudioUrl = () => {
    return product.audio_url ||
           product.meta_data?.find((meta: any) => meta.key === "audio_url")?.value ||
           product.meta_data?.find((meta: any) => meta.key === "audio")?.value ||
           null;
  };

  // Extract image URL
  const getImageUrl = () => {
    return product.images?.[0]?.src ||
           product.imageUrl ||
           product.image ||
           product.featured_image ||
           null;
  };

  // Extract downloads count
  const getDownloads = () => {
    return product.meta_data?.find((meta: any) => meta.key === "downloads")?.value ||
           product.meta_data?.find((meta: any) => meta.key === "total_sales")?.value ||
           product.total_sales ||
           0;
  };

  return {
    id: product.id,
    title: product.name || product.title || "",
    genre: getGenre(),
    bpm: getBPM(),
    price: getPrice(),
    isFree: isFree(),
    audioUrl: getAudioUrl(),
    imageUrl: getImageUrl(),
    tags: getTags(),
    duration: getDuration(),
    downloads: parseInt(getDownloads()) || 0,
    featured: product.featured || false,
  };
};