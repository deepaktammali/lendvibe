import { useQuery } from '@tanstack/react-query'
import {
  type DashboardStats,
  type DashboardSummary,
  dashboardKeys,
  dashboardService,
} from '@/services/api/dashboard.service'
import type { RecentActivity } from '@/types/api/dashboard'

export function useGetDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: dashboardKeys.summary(),
    queryFn: dashboardService.getDashboardSummary,
    staleTime: 1000 * 60 * 5, // 5 minutes - dashboard data can be slightly stale
  })
}

export function useGetDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardService.getDashboardStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGetRecentActivity() {
  return useQuery<RecentActivity[]>({
    queryKey: dashboardKeys.recentActivity(),
    queryFn: dashboardService.getRecentActivity,
    staleTime: 1000 * 60 * 2, // 2 minutes - activity data should be more fresh
  })
}
