import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Button, Avatar } from '@mui/material';
import { Menu as MenuIcon, Logout as LogoutIcon, Download as DownloadIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const [deferredPrompt, setDeferredPrompt] = React.useState(null);

    React.useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            return;
        }
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
        } else {
            console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null);
    };

    return (
        <AppBar
            position="fixed"
            className="glass-panel"
            sx={{
                zIndex: (theme) => theme.zIndex.drawer + 1,
                backgroundColor: 'rgba(5, 5, 5, 0.7)', // Fallback/Base
                borderBottom: '1px solid rgba(212, 175, 55, 0.1)',
            }}
        >
            <Toolbar>
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={onMenuClick}
                    sx={{ mr: 2, display: { sm: 'none' }, color: 'primary.main' }}
                >
                    <MenuIcon />
                </IconButton>

                <Typography
                    variant="h5"
                    noWrap
                    component="div"
                    sx={{
                        flexGrow: 1,
                        fontWeight: 700,
                        background: 'linear-gradient(45deg, #D4AF37, #F4D06F)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '0.05em'
                    }}
                >
                    RECEIPT MANAGER
                </Typography>

                {user && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {deferredPrompt && (
                            <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                startIcon={<DownloadIcon />}
                                onClick={handleInstallClick}
                                sx={{
                                    borderRadius: '20px',
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Install App
                            </Button>
                        )}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', color: 'black', width: 32, height: 32 }}>
                                {user.email ? user.email[0].toUpperCase() : 'U'}
                            </Avatar>
                            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.secondary' }}>
                                {user.email}
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<LogoutIcon />}
                            onClick={handleLogout}
                            sx={{
                                borderRadius: '20px',
                                textTransform: 'none',
                                borderColor: 'rgba(212, 175, 55, 0.5)',
                                '&:hover': {
                                    borderColor: '#D4AF37',
                                    backgroundColor: 'rgba(212, 175, 55, 0.05)'
                                }
                            }}
                        >
                            Logout
                        </Button>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Header;