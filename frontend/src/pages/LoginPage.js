import React, { useState } from 'react';
import { supabase } from '../supabase';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Link,
    Alert,
    Divider
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!supabase) {
            setError('Google login is not configured');
            return;
        }
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Failed to login with Google');
        }
    };

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="80vh"
        >
            <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Login
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Password"
                        type="password"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        color="primary"
                        size="large"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>

                    <Box textAlign="center">
                        <Link component={RouterLink} to="/register" variant="body2">
                            Don't have an account? Sign up
                        </Link>
                    </Box>

                    <Box sx={{ my: 2 }}>
                        <Divider>OR</Divider>
                    </Box>

                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<GoogleIcon />}
                        onClick={handleGoogleLogin}
                        sx={{ mb: 2 }}
                    >
                        Sign in with Google
                    </Button>

                </form>
            </Paper>
        </Box>
    );
};

export default LoginPage;
