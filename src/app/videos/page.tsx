import { VideoContent } from '@/components/video-content'
import { Metadata } from 'next/types'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Container } from '@/components/ui/container'
import type { SiteConfig, SiteInfo } from '@/types/site'
import type { NavigationData, NavigationDataRaw } from '@/types/navigation'
import { processSiteData, processNavigationData, filterNavigationData } from '@/lib/data-loader'

// ISR 配置：每 60 秒重新生成页面
export const revalidate = 60

// 从 GitHub 获取视频数据的函数
async function fetchVideoDataFromGitHub(): Promise<{ navigationData: NavigationData; siteData: SiteConfig }> {
  const owner = process.env.GITHUB_OWNER!
  const repo = process.env.GITHUB_REPO!
  const branch = process.env.GITHUB_BRANCH || 'main'

  try {
    // 并行获取视频和站点数据
    const [videosRes, siteRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/src/navsphere/content/videos.json?ref=${branch}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3.raw',
            'User-Agent': 'NavSphere',
          },
          next: { revalidate: 60 },
        }
      ),
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/src/navsphere/content/site.json?ref=${branch}`,
        {
          headers: {
            Accept: 'application/vnd.github.v3.raw',
            'User-Agent': 'NavSphere',
          },
          next: { revalidate: 60 },
        }
      ),
    ])

    let videosDataRaw: NavigationDataRaw = { navigationItems: [] }
    let siteDataRaw: SiteInfo = {} as SiteInfo

    if (videosRes.ok) {
      videosDataRaw = await videosRes.json()
    }

    if (siteRes.ok) {
      siteDataRaw = await siteRes.json()
    }

    const siteData = processSiteData(siteDataRaw)
    const processedNavigationData = processNavigationData(videosDataRaw)
    const navigationData = filterNavigationData(processedNavigationData)

    return { navigationData, siteData }
  } catch (error) {
    console.error('Failed to fetch video data from GitHub:', error)
    return {
      navigationData: { navigationItems: [] },
      siteData: {
        basic: { title: 'NavSphere', description: '', keywords: '' },
        appearance: { theme: 'system', favicon: '/favicon.png' },
        navigation: { linkTarget: '_blank' },
      } as SiteConfig,
    }
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteData } = await fetchVideoDataFromGitHub()

  return {
    title: `Videos - ${siteData.basic.title}`,
    description: 'Video Navigation',
    keywords: 'Bilibili, YouTube, Videos',
    icons: {
      icon: siteData.appearance.favicon,
    },
  }
}

export default async function VideosPage() {
  const { navigationData, siteData } = await fetchVideoDataFromGitHub()

  return (
    <Container>
      <VideoContent navigationData={navigationData} siteData={siteData} />
      <ScrollToTop />
    </Container>
  )
}
