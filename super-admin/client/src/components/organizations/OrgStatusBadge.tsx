import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrgStatusBadgeProps {
  status: 'active' | 'suspended' | 'deleted';
}

const variants: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  suspended: 'bg-amber-100 text-amber-700 border-amber-200',
  deleted: 'bg-red-100 text-red-700 border-red-200',
};

export function OrgStatusBadge({ status }: OrgStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn('capitalize', variants[status])}>
      {status}
    </Badge>
  );
}
