/*
 * Structured data (schema.org JSON-LD) from the page's metadata.
 *
 * Which schemas a page gets: the "schema" metadata, comma-separated (set per URL pattern on the
 * metadata page), e.g. "Organization, BreadcrumbList". VideoObject is added for a page with a
 * video-url.
 *
 * Site-wide values (metadata page, row /**): brand-name, website-url, logo-url, social-profiles
 * (comma-separated), customer-care-phone, support-email.
 * Page values: og:title, og:description, og:url (else the canonical link), og:image,
 * published-time, modified-time, author, author-url, and video-url, video-embed-url,
 * video-title, video-description, video-thumbnail, video-upload-date.
 * Breadcrumbs come from the URL's folders; ItemList from the cards on the page.
 */

const CONTEXT = 'https://schema.org';

// the first meta tag of that name (or og: property)
const meta = (name) => {
  const attr = name.includes(':') ? 'property' : 'name';
  return (document.head.querySelector(`meta[${attr}="${name}"]`)?.content || '').trim();
};
const list = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);
// a URL as an absolute one (an image picked in AEM is a path)
const absolute = (url) => (url ? new URL(url, window.location.origin).href : '');

/** Drops empty values; an object left with nothing but its @type is dropped too */
function prune(value) {
  if (Array.isArray(value)) {
    const items = value.map(prune).filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, prune(item)])
      .filter(([, item]) => item !== undefined);
    if (!entries.some(([key]) => !key.startsWith('@'))) return undefined;
    return Object.fromEntries(entries);
  }
  return value === '' || value === null || value === undefined || value === false ? undefined : value;
}

/**
 * The page's path on the site: from its published URL (og:url, else the canonical link), else
 * from the address without the AEM /content/<site> prefix and .html
 */
function sitePath() {
  const published = meta('og:url') || document.querySelector('link[rel="canonical"]')?.href;
  const path = published ? new URL(published, window.location.origin).pathname
    : window.location.pathname.replace(/^\/content\/[^/]+/, '');
  return path.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
}

function values() {
  const websiteUrl = meta('website-url') || `${window.location.origin}/`;
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  const modified = meta('modified-time') || meta('published-time');
  return {
    brandName: meta('brand-name'),
    websiteUrl,
    logoUrl: absolute(meta('logo-url')),
    socialProfiles: list(meta('social-profiles')).map(absolute),
    phone: meta('customer-care-phone'),
    email: meta('support-email'),
    title: meta('og:title') || document.title,
    description: meta('og:description'),
    url: meta('og:url') || canonical || new URL(sitePath(), websiteUrl).href,
    image: absolute(meta('og:image')),
    published: meta('published-time'),
    modified,
    author: meta('author'),
    authorUrl: absolute(meta('author-url')),
    video: {
      url: absolute(meta('video-url')),
      embedUrl: absolute(meta('video-embed-url') || meta('video-url')),
      title: meta('video-title') || meta('og:title'),
      description: meta('video-description') || meta('og:description'),
      thumbnail: absolute(meta('video-thumbnail') || meta('og:image')),
      uploadDate: meta('video-upload-date') || modified,
    },
  };
}

const organizationId = (v) => `${v.websiteUrl}#organization`;

const SCHEMAS = {
  Organization: (v) => v.brandName && {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': organizationId(v),
    name: v.brandName,
    url: v.websiteUrl,
    logo: v.logoUrl,
    sameAs: v.socialProfiles,
    contactPoint: v.phone && { '@type': 'ContactPoint', telephone: v.phone, contactType: 'customer service' },
  },

  // Home, then one level per folder of the URL (named from the folder), then the page
  BreadcrumbList: (v) => {
    const folders = sitePath().split('/').filter(Boolean);
    const items = [{ name: 'Home', item: v.websiteUrl }];
    folders.forEach((folder, i) => {
      const last = i === folders.length - 1;
      const name = last ? v.title : folder.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const path = `/${folders.slice(0, i + 1).join('/')}${last ? '' : '/'}`;
      items.push({ name, item: last ? v.url : new URL(path, v.websiteUrl).href });
    });
    return {
      '@context': CONTEXT,
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
    };
  },

  BlogPosting: (v) => ({
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: v.title,
    image: v.image,
    author: v.author && { '@type': 'Person', name: v.author, url: v.authorUrl },
    publisher: {
      '@type': 'Organization',
      name: v.brandName,
      logo: { '@type': 'ImageObject', url: v.logoUrl },
    },
    datePublished: v.published,
    dateModified: v.modified,
    mainEntityOfPage: v.url,
  }),

  // the cards on the page: each card's heading (else its first text) and link
  ItemList: (v, main) => {
    const cards = [...main.querySelectorAll('.cards > ul > li, .cards > div')];
    const items = cards.map((card) => {
      const link = card.querySelector('a[href]');
      const heading = card.querySelector('h1, h2, h3, h4, h5, h6, strong') || card.querySelector('p');
      return { name: (heading || link)?.textContent.trim(), url: link?.href };
    }).filter((item) => item.name && item.url);
    return items.length && {
      '@context': CONTEXT,
      '@type': 'ItemList',
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
    };
  },

  AboutPage: (v) => v.brandName && {
    '@context': CONTEXT,
    '@type': 'AboutPage',
    name: `About ${v.brandName}`,
    url: v.url,
    mainEntity: { '@type': 'Organization', '@id': organizationId(v) },
  },

  ContactPage: (v) => v.brandName && (v.phone || v.email) && {
    '@context': CONTEXT,
    '@type': 'ContactPage',
    name: `Contact ${v.brandName}`,
    url: v.url,
    mainEntity: {
      '@type': 'Organization',
      '@id': organizationId(v),
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: v.phone,
        email: v.email,
        contactType: 'customer service',
      },
    },
  },

  VideoObject: (v) => v.video.url && {
    '@context': CONTEXT,
    '@type': 'VideoObject',
    name: v.video.title,
    description: v.video.description,
    thumbnailUrl: v.video.thumbnail,
    uploadDate: v.video.uploadDate,
    contentUrl: v.video.url,
    embedUrl: v.video.embedUrl,
  },
};

/**
 * Adds the page's schemas to the head, one JSON-LD script each (replacing any added before).
 * @param {Element} main The main element
 */
export default function addSchemas(main = document.querySelector('main')) {
  const types = list(meta('schema'));
  if (meta('video-url') && !types.includes('VideoObject')) types.push('VideoObject');
  const v = values();
  document.head.querySelectorAll('script[data-schema]').forEach((script) => script.remove());
  types.forEach((type) => {
    const build = SCHEMAS[type];
    const data = build && prune(build(v, main) || undefined);
    if (!data) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.schema = type;
    script.textContent = JSON.stringify(data);
    document.head.append(script);
  });
}
