import { Box, Card, CardContent, Container, Grid, Skeleton, Stack } from '@mui/material';

export default function LoadingDashboard() {
  return (
    <Container maxWidth={false} sx={{ py: 4, px: { xs: 1.5, md: 3.5 } }}>
      <Skeleton variant="rounded" height={156} sx={{ borderRadius: 4, mb: 3 }} />
      <Grid container spacing={2.5}>
        {Array.from({ length: 6 }, (_, index) => <Grid item xs={12} sm={6} md={4} key={index}><Card><CardContent><Stack spacing={1}><Skeleton width="55%" /><Skeleton width="36%" height={48} /></Stack></CardContent></Card></Grid>)}
        <Grid item xs={12} md={7}><Skeleton variant="rounded" height={330} sx={{ borderRadius: 4 }} /></Grid>
        <Grid item xs={12} md={5}><Skeleton variant="rounded" height={330} sx={{ borderRadius: 4 }} /></Grid>
      </Grid>
      <Box sx={{ height: 24 }} />
    </Container>
  );
}
