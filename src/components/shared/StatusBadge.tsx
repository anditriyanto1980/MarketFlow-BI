import React from 'react';
import { Badge } from '@/src/components/ui/badge';

export const StatusBadge: React.FC<{ status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED' | string }> = ({
  status,
}) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Aktif</Badge>;
    case 'INACTIVE':
      return <Badge variant="default">Nonaktif</Badge>;
    case 'INVITED':
      return <Badge variant="info">Diundang</Badge>;
    case 'SUSPENDED':
      return <Badge variant="danger">Ditangguhkan</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
};
