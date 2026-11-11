import type { Metadata } from 'next';
import { VideoHub } from '@/components/hub/VideoHub';
import { SitePage } from '@/components/site/SiteHeader';
import { VideoIcon } from '@/components/ui/icons';
import { getSession } from '@/lib/data';
import { loadVideos } from '@/lib/hub';
import { sectionBack } from '@/lib/sections';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'فيديوهات تحفيزية' };

export default async function VideosPage() {
  const [{ profile }, supabase] = await Promise.all([getSession(), createClient()]);
  const videos = await loadVideos(supabase, profile);

  return (
    <SitePage back={sectionBack(profile, '/admin/videos')}>
      <p className="hello">دوس وشوف</p>
      <h1 className="gp-title">فيديوهات تحفيزية</h1>
      <p className="gp-sub">فيديو من التيم يفكّرك إنت بتذاكر ليه.</p>
      {videos.length ? (
        <VideoHub videos={videos} start={Math.floor(Math.random() * videos.length)} />
      ) : (
        <div className="card empty st-panel a-fadeup" style={{ maxWidth: 560 }}>
          <div className="e-ic">
            <VideoIcon size={30} />
          </div>
          <h3>لسه مفيش فيديوهات</h3>
          <p>التيم هينزّل فيديوهات هنا قريب.</p>
        </div>
      )}
    </SitePage>
  );
}
