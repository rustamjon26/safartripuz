import { getLandingStats } from '@/lib/landingStats';
import StatsSectionClient from './StatsSectionClient';

export default async function StatsSection() {
  const stats = await getLandingStats();
  return <StatsSectionClient stats={stats} />;
}
