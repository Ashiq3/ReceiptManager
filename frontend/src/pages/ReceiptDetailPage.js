import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Card,
    CardContent,
    Divider
} from '@mui/material';
import {
    ArrowBack,
    Download,
    Delete,
    Receipt as ReceiptIcon,
    Store,
    CalendarToday,
    Payment,
    AttachMoney
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ReceiptDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [receipt, setReceipt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const fetchReceipt = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`/api/receipts/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setReceipt(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching receipt:', err);
                setError(err.response?.data?.error?.message || 'Failed to load receipt details');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchReceipt();
        }
    }, [id, token]);

    const handleDownload = async () => {
        try {
            const response = await axios.get(`/api/receipts/${id}/file`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', receipt.original_filename || `receipt-${id}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading file:', err);
            alert('Failed to download receipt file');
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await axios.delete(`/api/receipts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeleteDialogOpen(false);
            navigate('/receipts', { replace: true });
        } catch (err) {
            console.error('Error deleting receipt:', err);
            alert('Failed to delete receipt');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/receipts')}
                    sx={{ mb: 2 }}
                >
                    Back to Receipts
                </Button>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!receipt) {
        return (
            <Box>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/receipts')}
                    sx={{ mb: 2 }}
                >
                    Back to Receipts
                </Button>
                <Alert severity="warning">Receipt not found</Alert>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/receipts')}
                    >
                        Back
                    </Button>
                    <Typography variant="h4" component="h1">
                        Receipt Details
                    </Typography>
                    <Chip
                        label={receipt.status}
                        color={receipt.status === 'processed' ? 'success' : receipt.status === 'failed' ? 'error' : 'warning'}
                        size="small"
                    />
                </Box>
                <Box display="flex" gap={2}>
                    <Button
                        variant="outlined"
                        startIcon={<Download />}
                        onClick={handleDownload}
                    >
                        Download
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Delete />}
                        onClick={() => setDeleteDialogOpen(true)}
                    >
                        Delete
                    </Button>
                </Box>
            </Box>

            {/* Receipt Info Cards */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Store color="primary" />
                                <Typography color="text.secondary" variant="body2">
                                    Vendor
                                </Typography>
                            </Box>
                            <Typography variant="h6">
                                {receipt.vendor_name || 'Unknown'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <CalendarToday color="primary" />
                                <Typography color="text.secondary" variant="body2">
                                    Date
                                </Typography>
                            </Box>
                            <Typography variant="h6">
                                {receipt.receipt_date
                                    ? new Date(receipt.receipt_date).toLocaleDateString()
                                    : 'Unknown'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <AttachMoney color="primary" />
                                <Typography color="text.secondary" variant="body2">
                                    Total Amount
                                </Typography>
                            </Box>
                            <Typography variant="h6" color="primary">
                                ${parseFloat(receipt.total_amount || 0).toFixed(2)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <Payment color="primary" />
                                <Typography color="text.secondary" variant="body2">
                                    Payment Method
                                </Typography>
                            </Box>
                            <Typography variant="h6">
                                {receipt.payment_method || 'Unknown'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Line Items Table */}
            <Paper sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <ReceiptIcon color="primary" />
                    <Typography variant="h6">Line Items</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {receipt.items && receipt.items.length > 0 ? (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Description</TableCell>
                                    <TableCell align="center">Quantity</TableCell>
                                    <TableCell align="right">Unit Price</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell>Category</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {receipt.items.map((item, index) => (
                                    <TableRow key={item.item_id || index}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell align="center">{item.quantity}</TableCell>
                                        <TableCell align="right">
                                            ${parseFloat(item.unit_price || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell align="right">
                                            ${parseFloat(item.total_price || 0).toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={item.category || 'General'}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                ) : (
                    <Typography color="text.secondary" align="center" py={4}>
                        No line items available
                    </Typography>
                )}
            </Paper>

            {/* Additional Info */}
            <Paper sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Additional Information</Typography>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Typography color="text.secondary" variant="body2">
                            Original Filename
                        </Typography>
                        <Typography>{receipt.original_filename || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography color="text.secondary" variant="body2">
                            Currency
                        </Typography>
                        <Typography>{receipt.currency || 'USD'}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography color="text.secondary" variant="body2">
                            Processed At
                        </Typography>
                        <Typography>
                            {receipt.processed_at
                                ? new Date(receipt.processed_at).toLocaleString()
                                : 'Not yet processed'}
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography color="text.secondary" variant="body2">
                            Receipt ID
                        </Typography>
                        <Typography>{receipt.receipt_id}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Extracted Data (Dynamic) */}
            {receipt.extracted_data && Object.keys(receipt.extracted_data).length > 0 && (
                <Paper sx={{ p: 3, mt: 3 }}>
                    <Typography variant="h6" gutterBottom>AI Extracted Details</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                        {Object.entries(receipt.extracted_data).map(([key, value]) => {
                            // Skip standard fields we already show or complex objects
                            if (['items', 'vendor', 'date', 'total', 'currency', 'payment_method', 'confidence'].includes(key) || typeof value === 'object') return null;
                            return (
                                <Grid item xs={12} md={4} key={key}>
                                    <Typography color="text.secondary" variant="body2" sx={{ textTransform: 'capitalize' }}>
                                        {key.replace(/_/g, ' ')}
                                    </Typography>
                                    <Typography variant="body1">{String(value)}</Typography>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Paper>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Receipt?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this receipt? This action cannot be undone.
                        The receipt file and all associated data will be permanently removed.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDelete}
                        color="error"
                        variant="contained"
                        disabled={deleting}
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReceiptDetailPage;
