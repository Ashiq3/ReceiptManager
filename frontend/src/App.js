import React, { useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Box, CssBaseline, Container, CircularProgress } from '@mui/material';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/700.css';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import PrivateRoute from './components/PrivateRoute';

// Pages - Lazy Loaded
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ReceiptsPage = React.lazy(() => import('./pages/ReceiptsPage'));
const ReceiptDetailPage = React.lazy(() => import('./pages/ReceiptDetailPage'));
const ScanPage = React.lazy(() => import('./pages/ScanPage'));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));

// Create Luxury Theme
let theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#D4AF37', // Champagne Gold
            light: '#F4D06F',
            dark: '#A68620',
            contrastText: '#000000',
        },
        secondary: {
            main: '#E0E0E0', // Silver/Platinum
            light: '#FFFFFF',
            dark: '#AEAEAE',
            contrastText: '#000000',
        },
        background: {
            default: '#050505', // Deep Onyx
            paper: '#1A1A1A',   // Dark Charcoal
        },
        text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255, 255, 255, 0.7)',
        },
        divider: 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
        h1: {
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
        },
        h2: {
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
        },
        h3: {
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
        },
        h4: {
            fontFamily: "'Playfair Display', serif",
            fontWeight: 600,
        },
        h5: {
            fontFamily: "'Playfair Display', serif",
            fontWeight: 500,
        },
        h6: {
            fontFamily: "'Playfair Display', serif",
            fontWeight: 500,
        },
        button: {
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            textTransform: 'none',
            letterSpacing: '0.02em',
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(45deg, #D4AF37 30%, #F4D06F 90%)',
                    color: '#000000',
                    '&:hover': {
                        background: 'linear-gradient(45deg, #A68620 30%, #D4AF37 90%)',
                    },
                },
                outlined: {
                    borderWidth: '1.5px',
                    '&:hover': {
                        borderWidth: '1.5px',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#1A1A1A',
                },
                elevation1: {
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(5, 5, 5, 0.8)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#0A0A0A',
                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        },
                        '&:hover fieldset': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#D4AF37',
                        },
                    },
                },
            },
        },
    },
});

theme = responsiveFontSizes(theme);

function App() {
    const { isAuthenticated, loading } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    if (loading) {
        return (
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="100vh"
                    bgcolor="background.default"
                >
                    <CircularProgress color="primary" />
                </Box>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
                {isAuthenticated && <Header onMenuClick={handleDrawerToggle} />}
                {isAuthenticated && (
                    <Sidebar
                        mobileOpen={mobileOpen}
                        handleDrawerToggle={handleDrawerToggle}
                    />
                )}

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: { xs: 2, md: 4 },
                        width: { sm: `calc(100% - 240px)` },
                        ml: { sm: '240px' },
                        mt: isAuthenticated ? '64px' : 0,
                        transition: 'margin 0.3s ease',
                    }}
                >
                    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
                        <Suspense fallback={
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                                <CircularProgress color="primary" />
                            </Box>
                        }>
                            <Routes>
                                <Route path="/login" element={
                                    isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />
                                } />
                                <Route path="/register" element={
                                    isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />
                                } />

                                <Route path="/" element={
                                    <PrivateRoute>
                                        <Navigate to="/dashboard" />
                                    </PrivateRoute>
                                } />

                                <Route path="/dashboard" element={
                                    <PrivateRoute>
                                        <DashboardPage />
                                    </PrivateRoute>
                                } />

                                <Route path="/receipts" element={
                                    <PrivateRoute>
                                        <ReceiptsPage />
                                    </PrivateRoute>
                                } />

                                <Route path="/receipts/:id" element={
                                    <PrivateRoute>
                                        <ReceiptDetailPage />
                                    </PrivateRoute>
                                } />

                                <Route path="/scan" element={
                                    <PrivateRoute>
                                        <ScanPage />
                                    </PrivateRoute>
                                } />

                                <Route path="/analytics" element={
                                    <PrivateRoute>
                                        <AnalyticsPage />
                                    </PrivateRoute>
                                } />

                                <Route path="/settings" element={
                                    <PrivateRoute>
                                        <SettingsPage />
                                    </PrivateRoute>
                                } />

                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </Suspense>
                    </Container>
                </Box>
            </Box>
        </ThemeProvider>
    );
}

export default App;