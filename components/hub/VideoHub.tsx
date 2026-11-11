'use client';

import { useRef, useState } from 'react';
import { ExternalIcon, PlayIcon, VideoIcon } from '@/components/ui/icons';
import { autoplayEmbed, parseVideoUrl, PLATFORM_LABELS } from '@/lib/videos';
import { ShareButton } from './ShareButton';

export interface HubVideo {
  id: string;
  title: string;
  url: string;
  description: string;
  cover_url: string | null;
}

function Poster({ video, big }: { video: HubVideo; big?: boolean }) {
  const info = parseVideoUrl(video.url);
  const src = video.cover_url || info?.thumb;
  return (
    <span className={`vd-poster-img${big ? ' big' : ''}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading={big ? 'eager' : 'lazy'} />
      ) : (
        <span className="vd-poster-bg" aria-hidden="true">
          <VideoIcon size={big ? 54 : 30} />
        </span>
      )}
      <span className="vd-play" aria-hidden="true">
        <PlayIcon size={big ? 34 : 20} />
      </span>
    </span>
  );
}

/** One featured video that plays in the page when tapped, and the rest below it. */
export function VideoHub({ videos, start }: { videos: HubVideo[]; start: number }) {
  const [current, setCurrent] = useState(start);
  const [playing, setPlaying] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const video = videos[current];
  const info = parseVideoUrl(video.url);
  const embed = info ? autoplayEmbed(info) : null;
  const platform = info ? PLATFORM_LABELS[info.platform] : '';

  function pick(i: number) {
    setCurrent(i);
    setPlaying(Boolean(parseVideoUrl(videos[i].url)?.embed));
    stageRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <div className="vd-wrap">
      <div ref={stageRef} className={`vd-stage${info?.vertical ? ' tall' : ''}`}>
        {playing && embed ? (
          <iframe
            key={video.id}
            src={embed}
            title={video.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : embed ? (
          <button type="button" className="vd-poster" onClick={() => setPlaying(true)} aria-label={`شغّل: ${video.title}`}>
            <Poster video={video} big />
          </button>
        ) : (
          <a className="vd-poster" href={video.url} target="_blank" rel="noopener noreferrer" aria-label={`افتح: ${video.title}`}>
            <Poster video={video} big />
          </a>
        )}
      </div>

      <div className="vd-info">
        <h2>{video.title}</h2>
        {video.description && <p>{video.description}</p>}
        <div className="row" style={{ justifyContent: 'center' }}>
          <a href={video.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">
            <ExternalIcon size={16} /> {info?.platform === 'link' ? 'افتح الرابط' : `افتحه على ${platform}`}
          </a>
          <ShareButton text={`${video.title}\n${video.url}`} label="ابعته لصاحبك" className="btn btn-sm btn-ghost" />
        </div>
      </div>

      {videos.length > 1 && (
        <section className="vd-more" aria-labelledby="vd-more-title">
          <h2 id="vd-more-title">فيديوهات تانية</h2>
          <div className="vd-grid">
            {videos.map((v, i) =>
              i === current ? null : (
                <button key={v.id} type="button" className="vd-card" onClick={() => pick(i)}>
                  <Poster video={v} />
                  <span className="vd-card-t">{v.title}</span>
                </button>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
