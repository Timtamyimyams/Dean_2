'use client'

import dynamic from 'next/dynamic'

const ProjectPlanningBoard = dynamic(
  () => import('./ProjectPlanningBoard'),
  { ssr: false }
)

export default function Home() {
  return <ProjectPlanningBoard />
}
