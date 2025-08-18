import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

export default function Footer() {
  return (
    <Box sx={{pb:{xs: 2, sm: 2, md: 3, lg: 4}}}>
      <Grid container sx={{mt: {xs: 2, sm: 2, md: 3, lg: 4}}}>
        <Grid container direction='column' sm={6} md={5} sx={{mx:{xs: 1, sm: 1, md: 3, lg: 4}, my:{xs: 1, sm: 1, md: 0, lg: 0}}}>
            <Typography sx={{fontFamily: 'system-ui', textAlign: 'left', fontWeight: 'bold', fontSize: '1.1rem', color: "#515151ff"}}>
                Omninet
            </Typography>
            <Typography sx={{fontFamily: 'system-ui', fontSize: '0.9rem', textAlign: 'left', fontWeight: 500, color: "grey"}}>
                Your gateway to secure networking
            </Typography>

        </Grid>
        <Grid container direction='column' size={7} sx={{mx:{xs: 1, sm: 1, md: 3, lg: 4},my:{xs: 1, sm: 1, md: 0, lg: 0}}}>
            <Typography sx={{fontFamily: 'system-ui', textAlign: 'left', fontWeight: 'bold', fontSize: '1rem', color: "#515151ff"}}>
                Quick links
            </Typography>      
            <Box sx={{fontFamily: 'system-ui', fontSize: '0.9rem', textAlign: 'left', fontWeight: 500, color: "grey"}}>
                <Typography sx={{mt:1,fontFamily: 'inherit', fontSize:'inherit', fontWeight: 'inherit'}}><Link href="/" underline="none" color="inherit">Home</Link></Typography>
                <Typography sx={{mt:1,fontFamily: 'inherit', fontSize:'inherit', fontWeight: 'inherit'}}><Link href="/storage" underline="none" color="inherit">Storage</Link></Typography>
                <Typography sx={{mt:1,fontFamily: 'inherit', fontSize:'inherit', fontWeight: 'inherit'}}><Link href="/notes" underline="none" color="inherit">Notes</Link></Typography>
            </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
