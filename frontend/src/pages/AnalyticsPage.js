import React, { useState, useEffect } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    CircularProgress
} from '@mui/material';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const AnalyticsPage = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('monthly');
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState(null);
    const [categories, setCategories] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const headers = { Authorization: `Bearer ${token}` };

                const [summaryRes, trendsRes, categoriesRes] = await Promise.all([
                    axios.get(`/api/analytics/summary?period=${period}`, { headers }),
                    axios.get(`/api/analytics/trends?period=${period}`, { headers }),
                    axios.get('/api/analytics/categories', { headers })
                ]);

                setSummary(summaryRes.data);
                setTrends(trendsRes.data);
                setCategories(categoriesRes.data);
            } catch (error) {
                console.error('Error fetching analytics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period, token]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    const trendChartData = {
        labels: trends?.trends.map(t => t.date) || [],
        datasets: [
            {
                label: 'Spending',
                data: trends?.trends.map(t => t.amount) || [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
                fill: false
            }
        ]
    };

    const categoryChartData = {
        labels: categories?.categories.map(c => c.name) || [],
        datasets: [
            {
                data: categories?.categories.map(c => c.value) || [],
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ],
            }
        ]
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Analytics Dashboard
                </Typography>
                <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                        value={period}
                        label="Period"
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <MenuItem value="monthly">Last 12 Months</MenuItem>
                        <MenuItem value="daily">Last 30 Days</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Spending
                            </Typography>
                            <Typography variant="h5">
                                ${summary?.total_spending.toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Receipts
                            </Typography>
                            <Typography variant="h5">
                                {summary?.total_receipts}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Average per Receipt
                            </Typography>
                            <Typography variant="h5">
                                ${summary?.average_per_receipt.toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Spending Trends
                        </Typography>
                        <Box height={300}>
                            <Line
                                data={trendChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (value) => '$' + value
                                            }
                                        }
                                    }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Top Categories
                        </Typography>
                        <Box height={300} display="flex" justifyContent="center">
                            <Doughnut
                                data={categoryChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'bottom'
                                        }
                                    }
                                }}
                            />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default AnalyticsPage;
