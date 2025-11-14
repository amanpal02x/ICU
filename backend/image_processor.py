"""
Image Processing Module for Disease Prediction

This module handles:
1. Image validation and preprocessing
2. Image resizing and normalization
3. Data augmentation (if needed)
4. Format conversion for model input
"""

import os
import cv2
import numpy as np
from PIL import Image
import io
from typing import Tuple, Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ImageProcessor:
    """Handles image preprocessing for disease prediction models."""

    def __init__(self, target_size: Tuple[int, int] = (224, 224)):
        """
        Initialize the image processor.

        Args:
            target_size: Target size for model input (height, width)
        """
        self.target_size = target_size
        self.allowed_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        self.max_file_size = 10 * 1024 * 1024  # 10MB limit

    def validate_image(self, file_content: bytes, filename: str) -> bool:
        """
        Validate uploaded image file.

        Args:
            file_content: Raw file bytes
            filename: Original filename

        Returns:
            bool: True if valid, False otherwise
        """
        try:
            # Check file size
            if len(file_content) > self.max_file_size:
                logger.error(f"File too large: {len(file_content)} bytes")
                return False

            # Check file extension
            file_ext = os.path.splitext(filename.lower())[1]
            if file_ext not in self.allowed_extensions:
                logger.error(f"Invalid file extension: {file_ext}")
                return False

            # Try to open with PIL to verify it's a valid image
            image = Image.open(io.BytesIO(file_content))
            image.verify()  # Verify the image is not corrupted

            return True

        except Exception as e:
            logger.error(f"Image validation failed: {str(e)}")
            return False

    def preprocess_image(self, file_content: bytes) -> Optional[np.ndarray]:
        """
        Preprocess image for model prediction.

        Args:
            file_content: Raw image bytes

        Returns:
            Preprocessed image array ready for model input, or None if failed
        """
        try:
            # Open image with PIL
            image = Image.open(io.BytesIO(file_content))

            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Resize image
            image = image.resize(self.target_size, Image.Resampling.LANCZOS)

            # Convert to numpy array
            img_array = np.array(image)

            # Normalize pixel values to [0, 1]
            img_array = img_array.astype(np.float32) / 255.0

            # Add batch dimension for model input
            img_array = np.expand_dims(img_array, axis=0)

            logger.info(f"Successfully preprocessed image to shape: {img_array.shape}")
            return img_array

        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            return None

    def preprocess_for_opencv(self, file_content: bytes) -> Optional[np.ndarray]:
        """
        Alternative preprocessing using OpenCV (useful for some models).

        Args:
            file_content: Raw image bytes

        Returns:
            Preprocessed image array, or None if failed
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(file_content, np.uint8)

            # Decode image
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if image is None:
                logger.error("Failed to decode image with OpenCV")
                return None

            # Convert BGR to RGB
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Resize image
            image = cv2.resize(image, self.target_size, interpolation=cv2.INTER_LANCZOS4)

            # Normalize to [0, 1]
            image = image.astype(np.float32) / 255.0

            # Add batch dimension
            image = np.expand_dims(image, axis=0)

            logger.info(f"Successfully preprocessed image with OpenCV to shape: {image.shape}")
            return image

        except Exception as e:
            logger.error(f"OpenCV preprocessing failed: {str(e)}")
            return None

    def get_image_info(self, file_content: bytes) -> Dict[str, Any]:
        """
        Extract basic information about the uploaded image.

        Args:
            file_content: Raw image bytes

        Returns:
            Dictionary with image metadata
        """
        try:
            image = Image.open(io.BytesIO(file_content))
            return {
                "format": image.format,
                "size": image.size,
                "mode": image.mode,
                "file_size_bytes": len(file_content)
            }
        except Exception as e:
            return {"error": str(e)}

# Global instance for reuse
image_processor = ImageProcessor()
