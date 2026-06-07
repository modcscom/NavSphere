import { NavigationContent } from '@/components/navigation-content'
import { Metadata } from 'next/types'
import { ScrollToTop } from '@/components/ScrollToTop'
import { Container } from '@/components/ui/container'
import type { SiteConfig, SiteInfo } from '@/types/site'
import type { NavigationData, NavigationDataRaw } from '@/types/navigation'

import { processSiteData, processNavigationData, filterNavigationData } from '@/lib/data-loader'

// ISR 配置：每 60 秒重新生成页面
export const revalidate = 60

// 从 GitHub 获取数据的函数
async function fetchDataFromGitHub(): Promise<{ navigationData: NavigationData; siteData: SiteConfig }> {
  const owner = process.env.GITHUB_OWNER!
  const repo = process.env.GITHUB_REPO!
  const branch = process.env.GITHUB_BRANCH || 'main'

  try {
    // 并行获取导航和站点数据
    const [navigationRes, siteRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/src/navsphere/content/navigation.json?ref=${branch}`,
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

    let navigationDataRaw: NavigationDataRaw = { navigationItems: [] }
    let siteDataRaw: SiteInfo = {} as SiteInfo

    if (navigationRes.ok) {
      navigationDataRaw = await navigationRes.json()
    }

    if (siteRes.ok) {
      siteDataRaw = await siteRes.json()
    }

    const siteData = processSiteData(siteDataRaw)
    const processedNavigationData = processNavigationData(navigationDataRaw)
    const navigationData = filterNavigationData(processedNavigationData)

    return { navigationData, siteData }
  } catch (error) {
    console.error('Failed to fetch data from GitHub:', error)
    // 出错时返回默认空数据
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
  const { siteData } = await fetchDataFromGitHub()

  return {
    title: siteData.basic.title,
    description: siteData.basic.description,
    keywords: siteData.basic.keywords,
    icons: {
      icon: siteData.appearance.favicon,
    },
  }
}

export default async function HomePage() {
  const { navigationData, siteData } = await fetchDataFromGitHub()

  return (
    <Container>
      <NavigationContent navigationData={navigationData} siteData={siteData} />
      <ScrollToTop />
    </Container>
  )
}
