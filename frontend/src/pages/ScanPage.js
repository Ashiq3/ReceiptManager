import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Paper, Tabs, Tab } from '@mui/material';
import { CameraAlt, UploadFile, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ScanPage = () => {
    const { token, business } = useAuth();
    const navigate = useNavigate();
    const [scanMethod, setScanMethod] = useState('camera');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [receiptId, setReceiptId] = useState(null);
    const [file, setFile] = useState(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const handleScanMethodChange = (event, newValue) => {
        setScanMethod(newValue);
        setError(null);
        setSuccess(false);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        try {
            setIsProcessing(true);
            setProgress(0);
            setError(null);
            setSuccess(false);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('business_id', business.business_id);

            const response = await axios.post('/api/receipts/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setProgress(percentCompleted);
                }
            });

            setReceiptId(response.data.receipt_id);
            setSuccess(true);
            setIsProcessing(false);

            // Start polling for status
            pollStatus(response.data.receipt_id);
        } catch (error) {
            setError(error.response?.data?.error?.message || 'Upload failed');
            setIsProcessing(false);
        }
    };

    const pollStatus = async (id) => {
        try {
            const response = await axios.get(`/api/receipts/${id}/status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data.status === 'processed') {
                setSuccess(true);
                setIsProcessing(false);
            } else if (response.data.status === 'failed') {
                setError('Processing failed');
                setIsProcessing(false);
            } else {
                // Continue polling
                setTimeout(() => pollStatus(id), 2000);
            }
        } catch (error) {
            setError('Failed to check status');
            setIsProcessing(false);
        }
    };

    const handleCameraCapture = async () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Draw video frame to canvas
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob
            canvas.toBlob(async (blob) => {
                if (blob) {
                    const capturedFile = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
                    setFile(capturedFile);
                    await handleUpload();
                }
            }, 'image/jpeg');
        }
    };

    useEffect(() => {
        let videoElement = null;

        if (scanMethod === 'camera') {
            // Request camera access
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            })
                .then((stream) => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoElement = videoRef.current;
                    }
                })
                .catch(() => {
                    setError('Camera access denied. Please enable camera permissions.');
                });

            return () => {
                if (videoElement?.srcObject) {
                    videoElement.srcObject.getTracks().forEach(track => track.stop());
                }
            };
        }
    }, [scanMethod]);

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Scan Receipt
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Tabs value={scanMethod} onChange={handleScanMethodChange}>
                    <Tab label="Camera" value="camera" icon={<CameraAlt />} />
                    <Tab label="Upload" value="upload" icon={<UploadFile />} />
                </Tabs>
            </Paper>

            {scanMethod === 'camera' ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', maxWidth: '600px', border: '1px solid #ddd' }}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCameraCapture}
                        disabled={isProcessing}
                        startIcon={<CameraAlt />}
                    >
                        Capture Receipt
                    </Button>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="file-upload"
                    />
                    <label htmlFor="file-upload">
                        <Button
                            variant="contained"
                            component="span"
                            startIcon={<UploadFile />}
                        >
                            Select File
                        </Button>
                    </label>
                    {file && (
                        <Typography variant="body1">
                            Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                        </Typography>
                    )}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={isProcessing || !file}
                        startIcon={<UploadFile />}
                    >
                        Upload Receipt
                    </Button>
                </Box>
            )}

            {isProcessing && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <CircularProgress variant="determinate" value={progress} />
                    <Typography variant="body1" sx={{ mt: 1 }}>
                        Processing receipt... {progress}%
                    </Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert
                    severity="success"
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => navigate(`/receipts/${receiptId}`)}
                        >
                            VIEW RECEIPT
                        </Button>
                    }
                    sx={{ mt: 2 }}
                >
                    <CheckCircle sx={{ mr: 1 }} />
                    Receipt processed successfully!
                </Alert>
            )}
        </Box>
    );
};

export default ScanPage;