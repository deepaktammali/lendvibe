import { useQuery } from '@tanstack/react-query'
import { dashboardService, dashboardKeys } from '@/services/api/dashboardService'

export function useGetDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: dashboardService.getDashboardSummary,
    staleTime: 1000 * 60 * 5, // 5 minutes - dashboard data can be slightly stale
  })
}

export function useGetDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: dashboardService.getDashboardStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useGetRecentActivity() {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(),
    queryFn: dashboardService.getRecentActivity,
    staleTime: 1000 * 60 * 2, // 2 minutes - activity data should be more fresh
  })
}
