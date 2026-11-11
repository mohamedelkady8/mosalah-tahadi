export type VideoPlatform = 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'drive' | 'link';

export interface VideoInfo {
  platform: VideoPlatform;
  /** Player URL for an iframe, or null when the video only opens on its own site. */
  embed: string | null;
  /** Preview picture when the platform gives one without an API (YouTube). */
  thumb: string | null;
  /** Reels, Shorts and TikToks are portrait. */
  vertical: boolean;
  url: string;
}

export const PLATFORM_LABELS: Record<VideoPlatform, string> = {
  youtube: 'يوتيوب',
  facebook: 'فيسبوك',
  tiktok: 'تيك توك',
  instagram: 'إنستجرام',
  drive: 'جوجل درايف',
  link: 'رابط',
};

function youtubeStart(t: string | null): number {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/** Works out how to show a video link: YouTube, Facebook, TikTok, Instagram and Drive play inside the page. */
export function parseVideoUrl(raw: string): VideoInfo | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|web|music)\./, '');
  const path = u.pathname;
  const url = u.href;

  if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
    let id = '';
    let vertical = false;
    if (host === 'youtu.be') id = path.split('/')[1] ?? '';
    else if (path === '/watch') id = u.searchParams.get('v') ?? '';
    else {
      const m = /^\/(shorts|embed|live|v)\/([^/?#]+)/.exec(path);
      if (m) {
        id = m[2];
        vertical = m[1] === 'shorts';
      }
    }
    if (!/^[\w-]{11}$/.test(id)) return { platform: 'youtube', embed: null, thumb: null, vertical: false, url };
    const start = youtubeStart(u.searchParams.get('t') ?? u.searchParams.get('start'));
    return {
      platform: 'youtube',
      embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1${start ? `&start=${start}` : ''}`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      vertical,
      url,
    };
  }

  if (host === 'facebook.com' || host === 'fb.watch' || host === 'fb.com') {
    const vertical = /^\/(reel|share\/r)\//.test(path);
    return {
      platform: 'facebook',
      embed: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=560`,
      thumb: null,
      vertical,
      url,
    };
  }

  if (host === 'tiktok.com') {
    const m = /\/video\/(\d+)/.exec(path);
    return { platform: 'tiktok', embed: m ? `https://www.tiktok.com/embed/v2/${m[1]}` : null, thumb: null, vertical: true, url };
  }
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') return { platform: 'tiktok', embed: null, thumb: null, vertical: true, url };

  if (host === 'instagram.com') {
    const m = /^\/(reels?|p|tv)\/([\w-]+)/.exec(path);
    const kind = m?.[1] === 'p' ? 'p' : 'reel';
    return { platform: 'instagram', embed: m ? `https://www.instagram.com/${kind}/${m[2]}/embed` : null, thumb: null, vertical: true, url };
  }

  if (host === 'drive.google.com') {
    const id = /\/file\/d\/([\w-]+)/.exec(path)?.[1] ?? u.searchParams.get('id');
    return { platform: 'drive', embed: id ? `https://drive.google.com/file/d/${id}/preview` : null, thumb: null, vertical: false, url };
  }

  return { platform: 'link', embed: null, thumb: null, vertical: false, url };
}

/** The player starts on its own: the student already pressed play on our poster. */
export function autoplayEmbed(info: VideoInfo): string | null {
  if (!info.embed) return null;
  if (info.platform === 'youtube') return `${info.embed}&autoplay=1`;
  if (info.platform === 'facebook') return `${info.embed}&autoplay=true`;
  return info.embed;
}
