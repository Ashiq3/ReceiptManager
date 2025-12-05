import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Box, Typography } from '@mui/material';
import { Dashboard, Receipt, CameraAlt, Analytics, Settings } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Receipts', icon: <Receipt />, path: '/receipts' },
    { text: 'Scan', icon: <CameraAlt />, path: '/scan' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (path) => {
        navigate(path);
        if (mobileOpen) {
            handleDrawerToggle();
        }
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0A0A0A' }}>
            <Toolbar />
            <Box sx={{ p: 2 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: '0.1em' }}>
                    MENU
                </Typography>
            </Box>
            <List sx={{ px: 2 }}>
                {menuItems.map((item) => {
                    const isSelected = location.pathname === item.path;
                    return (
                        <ListItem
                            button
                            key={item.text}
                            selected={isSelected}
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                                borderRadius: '8px',
                                mb: 1,
                                transition: 'all 0.2s ease',
                                backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                borderLeft: isSelected ? '3px solid #D4AF37' : '3px solid transparent',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    transform: 'translateX(4px)',
                                },
                                '&.Mui-selected': {
                                    backgroundColor: 'rgba(212, 175, 55, 0.15)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(212, 175, 55, 0.2)',
                                    }
                                }
                            }}
                        >
                            <ListItemIcon sx={{
                                color: isSelected ? '#D4AF37' : 'text.secondary',
                                minWidth: 40
                            }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.text}
                                primaryTypographyProps={{
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? '#FFFFFF' : 'text.secondary',
                                    fontFamily: "'Inter', sans-serif"
                                }}
                            />
                        </ListItem>
                    );
                })}
            </List>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                    v1.0.0 • Luxury Edition
                </Typography>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Mobile drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: 'none' },
                }}
            >
                {drawer}
            </Drawer>

            {/* Desktop drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': {
                        boxSizing: 'border-box',
                        width: drawerWidth,
                        borderRight: 'none',
                        backgroundColor: '#0A0A0A'
                    },
                }}
            >
                {drawer}
            </Drawer>
        </>
    );
};

export default Sidebar;