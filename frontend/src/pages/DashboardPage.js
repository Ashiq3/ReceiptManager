import React from 'react';
import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Add as AddIcon, Analytics as AnalyticsIcon, Receipt as ReceiptIcon } from '@mui/icons-material';

const DashboardPage = () => {
    const navigate = useNavigate();

    return (
        <Box>
            <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={4}
                sx={{
                    animation: 'fadeIn 0.5s ease-in-out',
                    '@keyframes fadeIn': {
                        '0%': { opacity: 0, transform: 'translateY(10px)' },
                        '100%': { opacity: 1, transform: 'translateY(0)' }
                    }
                }}
            >
                <Box>
                    <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main' }}>
                        Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Welcome back. Here's your financial overview.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/scan')}
                    sx={{
                        px: 4,
                        py: 1.5,
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: '50px',
                        boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 6px 20px rgba(212, 175, 55, 0.4)',
                        }
                    }}
                >
                    Scan Receipt
                </Button>
            </Box>

            {/* Quick Stats Cards Placeholder - Can be expanded later */}
            <Grid container spacing={3} mb={4}>
                {[
                    { label: 'Total Receipts', value: '124', trend: '+12%' },
                    { label: 'Monthly Spend', value: '$3,240', trend: '+5%' },
                    { label: 'Pending Review', value: '3', trend: '-2' }
                ].map((stat, index) => (
                    <Grid item xs={12} md={4} key={index}>
                        <Paper
                            className="glass-card"
                            sx={{
                                p: 3,
                                borderRadius: 2,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}
                        >
                            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                {stat.label}
                            </Typography>
                            <Box mt={2} display="flex" alignItems="baseline" justifyContent="space-between">
                                <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary' }}>
                                    {stat.value}
                                </Typography>
                                <Typography variant="body2" sx={{ color: stat.trend.startsWith('+') ? '#4caf50' : '#f44336', fontWeight: 600 }}>
                                    {stat.trend}
                                </Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Quick Actions */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper
                        className="glass-card"
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
                            }
                        }}
                        onClick={() => navigate('/receipts')}
                    >
                        <Box display="flex" alignItems="center" mb={2}>
                            <ReceiptIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    View Receipts
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Browse and manage all your receipts
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper
                        className="glass-card"
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)'
                            }
                        }}
                        onClick={() => navigate('/analytics')}
                    >
                        <Box display="flex" alignItems="center" mb={2}>
                            <AnalyticsIcon sx={{ mr: 2, color: 'primary.main', fontSize: 40 }} />
                            <Box>
                                <Typography variant="h6" gutterBottom>
                                    View Analytics
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Analyze your spending patterns
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DashboardPage;
