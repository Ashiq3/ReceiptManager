import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const SettingsPage = () => {
    const { logout, user } = useAuth();

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Settings
            </Typography>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Profile Information
                </Typography>
                <Typography><strong>Name:</strong> {user?.full_name}</Typography>
                <Typography><strong>Email:</strong> {user?.email}</Typography>
                <Typography gutterBottom><strong>Business:</strong> {user?.business_name}</Typography>

                <Box mt={3}>
                    <Button variant="outlined" color="error" onClick={logout}>
                        Logout
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default SettingsPage;
