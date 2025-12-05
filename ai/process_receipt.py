#!/usr/bin/env python3
"""
AI Receipt Processing Script
This script processes receipt images and extracts structured data using OCR and NLP.
"""

import sys
import json
import os
import cv2
import numpy as np
import pytesseract
from datetime import datetime
import re
import argparse
from typing import Dict, List, Optional

# Configure paths
pytesseract.pytesseract.tesseract_cmd = '/usr/bin/tesseract'

class ReceiptProcessor:
    def __init__(self):
        self.debug = os.getenv('AI_DEBUG', 'false').lower() == 'true'

    def preprocess_image(self, image_path: str) -> np.ndarray:
        """Preprocess image for better OCR results"""
        try:
            # Read image
            image = cv2.imread(image_path)

            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Apply thresholding
            _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)

            # Remove noise
            kernel = np.ones((1, 1), np.uint8)
            processed = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
            processed = cv2.medianBlur(processed, 3)

            return processed
        except Exception as e:
            raise RuntimeError(f"Image preprocessing failed: {str(e)}")

    def extract_text(self, image: np.ndarray) -> str:
        """Extract text from image using Tesseract OCR"""
        try:
            # Configure Tesseract
            custom_config = r'--oem 3 --psm 6'

            # Extract text
            text = pytesseract.image_to_string(image, config=custom_config)

            if self.debug:
                print("Extracted text:")
                print(text)

            return text
        except Exception as e:
            raise RuntimeError(f"Text extraction failed: {str(e)}")

    def parse_date(self, text: str) -> Optional[str]:
        """Parse date from receipt text"""
        date_patterns = [
            r'\b\d{1,2}/\d{1,2}/\d{2,4}\b',  # MM/DD/YY or MM/DD/YYYY
            r'\b\d{1,2}-\d{1,2}-\d{2,4}\b',  # MM-DD-YY or MM-DD-YYYY
            r'\b\d{4}-\d{2}-\d{2}\b',         # YYYY-MM-DD
            r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b',
            r'\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b'
        ]

        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                date_str = match.group(0)
                try:
                    # Try to parse the date
                    if '/' in date_str:
                        parsed = datetime.strptime(date_str, '%m/%d/%Y')
                    elif '-' in date_str and len(date_str.split('-')[0]) == 4:
                        parsed = datetime.strptime(date_str, '%Y-%m-%d')
                    else:
                        # Try various formats
                        for fmt in ('%m-%d-%Y', '%d-%m-%Y', '%m/%d/%y', '%d/%m/%y'):
                            try:
                                parsed = datetime.strptime(date_str, fmt)
                                break
                            except ValueError:
                                continue

                    return parsed.strftime('%Y-%m-%d')
                except ValueError:
                    continue

        return None

    def parse_vendor(self, text: str) -> str:
        """Extract vendor name from receipt text"""
        # Look for common vendor patterns
        patterns = [
            r'(?i)(vendor|merchant|store|restaurant|cafe|shop):?\s*(.+)',
            r'(?i)(thank you|visit again|welcome to)\s*(.+)',
            r'^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Inc|LLC|Corp|Ltd|Pty)\b',
            r'^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Restaurant|Cafe|Store|Market|Shop)\b'
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.MULTILINE)
            if match:
                vendor = match.group(1).strip()
                if len(vendor) > 2:
                    return vendor

        # Fallback: first few words
        lines = text.split('\n')
        for line in lines[:3]:
            line = line.strip()
            if len(line) > 2 and not line.startswith('Date:') and not line.startswith('Time:'):
                return line

        return "Unknown Vendor"

    def parse_total(self, text: str) -> float:
        """Extract total amount from receipt"""
        # Look for total patterns
        patterns = [
            r'(?i)(total|amount|balance|due):?\s*[\$€£]?\s*([\d,]+\.\d{2})',
            r'(?i)(subtotal|total|amount)\s*[\$€£]?\s*([\d,]+\.\d{2})',
            r'[\$€£]?\s*([\d,]+\.\d{2})\s*(?i)(total|due|balance)'
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                amount_str = match.group(1).replace(',', '')
                try:
                    return float(amount_str)
                except ValueError:
                    continue

        # Fallback: look for last amount
        amounts = re.findall(r'[\$€£]?\s*([\d,]+\.\d{2})', text)
        if amounts:
            return float(amounts[-1].replace(',', ''))

        return 0.0

    def parse_payment_method(self, text: str) -> str:
        """Extract payment method from receipt"""
        methods = ['cash', 'credit', 'debit', 'visa', 'mastercard', 'amex', 'discover',
                   'paypal', 'venmo', 'apple pay', 'google pay', 'mobile pay']

        text_lower = text.lower()

        for method in methods:
            if method in text_lower:
                return method.capitalize()

        return "Unknown"

    def parse_items(self, text: str) -> List[Dict]:
        """Extract line items from receipt"""
        items = []
        lines = text.split('\n')

        # Look for item patterns
        item_pattern = r'([A-Za-z\s]+)\s+(\d+)\s+@\s+([\$€£]?\s*[\d,]+\.\d{2})\s+([\$€£]?\s*[\d,]+\.\d{2})'

        for line in lines:
            match = re.search(item_pattern, line)
            if match:
                description = match.group(1).strip()
                quantity = int(match.group(2))
                unit_price = float(match.group(3).replace('$', '').replace(',', ''))
                total_price = float(match.group(4).replace('$', '').replace(',', ''))

                items.append({
                    'description': description,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'total_price': total_price,
                    'category': 'general'
                })

        return items

    def process_receipt(self, image_path: str) -> Dict:
        """Main processing method"""
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image_path)

            # Extract text
            text = self.extract_text(processed_image)

            # Parse data
            vendor = self.parse_vendor(text)
            date = self.parse_date(text) or datetime.now().strftime('%Y-%m-%d')
            total = self.parse_total(text)
            payment_method = self.parse_payment_method(text)
            items = self.parse_items(text)

            # Calculate confidence (simplified)
            confidence = 0.95 if len(items) > 0 else 0.85

            return {
                'vendor': vendor,
                'date': date,
                'total': total,
                'payment_method': payment_method,
                'currency': 'USD',
                'raw_text': text,
                'confidence': confidence,
                'items': items
            }
        except Exception as e:
            return {
                'error': str(e),
                'vendor': 'Unknown',
                'date': datetime.now().strftime('%Y-%m-%d'),
                'total': 0.0,
                'payment_method': 'Unknown',
                'currency': 'USD',
                'raw_text': '',
                'confidence': 0.5,
                'items': []
            }

def main():
    # Parse arguments
    parser = argparse.ArgumentParser(description='Process receipt image')
    parser.add_argument('image_path', help='Path to receipt image')
    args = parser.parse_args()

    # Process receipt
    processor = ReceiptProcessor()
    result = processor.process_receipt(args.image_path)

    # Output JSON result
    print(json.dumps(result))

if __name__ == '__main__':
    main()