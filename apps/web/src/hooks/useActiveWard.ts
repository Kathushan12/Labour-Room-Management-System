import { useEffect, useState } from 'react';
import { WardDto } from '@lrms/shared';
import { fetchWards } from '../services/wards.api.js';

const PRIMARY_WARD_CODE = 'WARD-18';

export function useActiveWard(): { ward: WardDto | null; loading: boolean } {
  const [ward, setWard] = useState<WardDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchWards()
      .then((res) => {
        if (!mounted || !res.success || !res.data?.items.length) return;
        const items = res.data.items;
        setWard(items.find((w) => w.code === PRIMARY_WARD_CODE) ?? items[0]);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { ward, loading };
}
