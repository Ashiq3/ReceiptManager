import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    CircularProgress,
    TextField,
    Grid,
    Button,
    InputAdornment,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Tooltip,
    Alert
} from '@mui/material';
import {
    Visibility,
    Delete,
    Download,
    Search,
    Clear,
    FilterList
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ReceiptsPage = () => {
    const navigate = useNavigate();
    const { token } = useAuth();

    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalCount, setTotalCount] = useState(0);

    // Filter states
    const [vendorSearch, setVendorSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [receiptToDelete, setReceiptToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchReceipts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = new URLSearchParams();
            if (vendorSearch) params.append('vendor', vendorSearch);
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (minAmount) params.append('min_amount', minAmount);
            if (maxAmount) params.append('max_amount', maxAmount);

            const response = await axios.get(`/api/receipts?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setReceipts(response.data.receipts || []);
            setTotalCount(response.data.total_count || 0);
        } catch (err) {
            console.error('Error fetching receipts:', err);
            setError('Failed to load receipts');
        } finally {
            setLoading(false);
        }
    }, [token, vendorSearch, startDate, endDate, minAmount, maxAmount]);

    useEffect(() => {
        fetchReceipts();
    }, [fetchReceipts]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchReceipts();
    };

    const handleClearFilters = () => {
        setVendorSearch('');
        setStartDate('');
        setEndDate('');
        setMinAmount('');
        setMaxAmount('');
    };

    const handleView = (receiptId) => {
        navigate(`/receipts/${receiptId}`);
    };

    const handleDownload = async (e, receipt) => {
        e.stopPropagation();
        try {
            const response = await axios.get(`/api/receipts/${receipt.receipt_id}/file`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receipt-${receipt.receipt_id}.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error downloading file:', err);
            alert('Failed to download receipt file');
        }
    };

    const handleDeleteClick = (e, receipt) => {
        e.stopPropagation();
        setReceiptToDelete(receipt);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!receiptToDelete) return;

        try {
            setDeleting(true);
            await axios.delete(`/api/receipts/${receiptToDelete.receipt_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeleteDialogOpen(false);
            setReceiptToDelete(null);
            fetchReceipts(); // Refresh the list
        } catch (err) {
            console.error('Error deleting receipt:', err);
            alert('Failed to delete receipt');
        } finally {
            setDeleting(false);
        }
    };

    const hasActiveFilters = vendorSearch || startDate || endDate || minAmount || maxAmount;

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Receipts
            </Typography>

            {/* Search & Filter Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <FilterList color="primary" />
                    <Typography variant="h6">Search & Filter</Typography>
                </Box>

                <form onSubmit={handleSearch}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Search Vendor"
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="Start Date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="date"
                                label="End Date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Min Amount"
                                value={minAmount}
                                onChange={(e) => setMinAmount(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                            />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                label="Max Amount"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                            />
                        </Grid>
                    </Grid>

                    <Box display="flex" gap={2} mt={2}>
                        <Button type="submit" variant="contained" startIcon={<Search />}>
                            Search
                        </Button>
                        {hasActiveFilters && (
                            <Button
                                variant="outlined"
                                startIcon={<Clear />}
                                onClick={handleClearFilters}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </Box>
                </form>
            </Paper>

            {/* Results Count */}
            {!loading && (
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Showing {receipts.length} of {totalCount} receipts
                    {hasActiveFilters && ' (filtered)'}
                </Typography>
            )}

            {/* Error Alert */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            {/* Loading */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            ) : (
                /* Receipts Table */
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Vendor</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {receipts.map((receipt) => (
                                <TableRow
                                    key={receipt.receipt_id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleView(receipt.receipt_id)}
                                >
                                    <TableCell>
                                        {receipt.receipt_date
                                            ? new Date(receipt.receipt_date).toLocaleDateString()
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell>{receipt.vendor_name || 'Unknown'}</TableCell>
                                    <TableCell>
                                        ${parseFloat(receipt.total_amount || 0).toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={receipt.status}
                                            color={
                                                receipt.status === 'processed' ? 'success' :
                                                    receipt.status === 'failed' ? 'error' : 'warning'
                                            }
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View Details">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleView(receipt.receipt_id);
                                                }}
                                            >
                                                <Visibility />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Download">
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleDownload(e, receipt)}
                                            >
                                                <Download />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={(e) => handleDeleteClick(e, receipt)}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {receipts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center">
                                        <Typography color="text.secondary" py={4}>
                                            {hasActiveFilters
                                                ? 'No receipts match your filters'
                                                : 'No receipts found'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Delete Receipt?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this receipt from{' '}
                        <strong>{receiptToDelete?.vendor_name || 'Unknown Vendor'}</strong>?
                        This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
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

export default ReceiptsPage;
