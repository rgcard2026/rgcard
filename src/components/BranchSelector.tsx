'use client';

import * as React from 'react';
import { Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import CallRoundedIcon from '@mui/icons-material/CallRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';

type Gov = { id: number; name: string };
type Branch = { id: number; name: string; address?: string | null; phone?: string | null; mapUrl?: string | null; governorate: Gov };

export default function BranchSelector({ governorates, branches }: { governorates: Gov[]; branches: Branch[] }) {
  const [governorateId, setGovernorateId] = React.useState<number | ''>(governorates[0]?.id || '');
  const isGlobalBranch = (branch: Branch) => /جميع الفروع|جميع المحافظات|الفروع المتاحة|اونلاين|أونلاين/i.test(branch.name);
  const filtered = governorateId
    ? branches.filter((branch) => branch.governorate.id === Number(governorateId) || isGlobalBranch(branch))
    : branches;

  return (
    <>
      {governorates.length > 0 ? <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>اختر المحافظة</InputLabel>
        <Select label="اختر المحافظة" value={governorateId} onChange={(e) => setGovernorateId(e.target.value as number)}>
          {governorates.map((gov) => <MenuItem key={gov.id} value={gov.id}>{gov.name}</MenuItem>)}
        </Select>
      </FormControl> : <Typography color="text.secondary" sx={{ mb: 3 }}>لم يتم تحديد محافظات لهذا المكان بعد.</Typography>}
      <Stack spacing={2}>
        {filtered.map((branch) => (
          <Box key={branch.id} sx={{ p: 2.5, borderRadius: 4, border: '1px solid var(--rg-line)', bgcolor: 'var(--rg-surface)' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
              <Box>
                <Typography fontWeight={900}>{branch.name}</Typography>
                <Stack direction="row" spacing={.5} color="text.secondary" sx={{ mt: .5 }}>
                  <LocationOnRoundedIcon fontSize="small" />
                  <Typography fontSize={14}>{isGlobalBranch(branch) ? (branch.address || 'متاح بجميع المحافظات') : `${branch.governorate.name} - ${branch.address || 'العنوان غير متوفر'}`}</Typography>
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                {branch.phone && <Button href={`tel:${branch.phone}`} variant="outlined" startIcon={<CallRoundedIcon />}>اتصال</Button>}
                {branch.mapUrl && <Button href={branch.mapUrl} target="_blank" variant="contained" startIcon={<MapRoundedIcon />}>الخريطة</Button>}
              </Stack>
            </Stack>
          </Box>
        ))}
        {governorateId && !filtered.length && <Box sx={{ p: 2.5, borderRadius: 4, border: '1px dashed var(--rg-accent-border)', bgcolor: 'var(--rg-surface)' }}>
          <Typography fontWeight={900}>المكان متاح في المحافظة المحددة</Typography>
          <Typography color="text.secondary" fontSize={14} sx={{ mt: .5 }}>بيانات الفرع التفصيلية غير مضافة حاليًا.</Typography>
        </Box>}
      </Stack>
    </>
  );
}
