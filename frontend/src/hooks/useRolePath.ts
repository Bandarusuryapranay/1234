import { useLocation } from 'react-router-dom';

export function useRolePath() {
  const { pathname } = useLocation();
  const prefix = pathname.startsWith('/admin') ? '/admin' : '/recruiter';
  
  return {
    prefix,
    candidatePath: (id: string) => `${prefix}/${prefix === '/admin' ? 'candidates' : 'scorecard'}/${id}`,
    monitorPath: (campaignId?: string) => `${prefix}/monitor${campaignId ? `?campaign=${campaignId}` : ''}`,
    reportsPath: `${prefix}/reports`,
    candidatesManagementPath: `${prefix}/${prefix === '/admin' ? 'candidates-management' : 'candidates'}`,
    dashboardPath: `${prefix}/dashboard`,
  };
}
