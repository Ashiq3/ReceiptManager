import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleClearCache = () => {
        localStorage.clear();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight="100vh"
                    bgcolor="#f5f5f5"
                    p={3}
                >
                    <Paper elevation={3} sx={{ p: 4, maxWidth: 600, width: '100%', textAlign: 'center' }}>
                        <Typography variant="h4" color="error" gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body1" color="textSecondary" paragraph>
                            The application encountered an unexpected error.
                        </Typography>

                        {this.state.error && (
                            <Box
                                component="pre"
                                sx={{
                                    mt: 2,
                                    mb: 3,
                                    p: 2,
                                    bgcolor: '#eee',
                                    borderRadius: 1,
                                    overflowX: 'auto',
                                    textAlign: 'left',
                                    fontSize: '0.875rem'
                                }}
                            >
                                {this.state.error.toString()}
                            </Box>
                        )}

                        <Box display="flex" justifyContent="center" gap={2} mt={3}>
                            <Button variant="contained" color="primary" onClick={this.handleReload}>
                                Reload Page
                            </Button>
                            <Button variant="outlined" color="secondary" onClick={this.handleClearCache}>
                                Clear Cache & Reload
                            </Button>
                        </Box>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
