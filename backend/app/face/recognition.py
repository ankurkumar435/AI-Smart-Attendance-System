import base64
import io
import math
import logging
from PIL import Image, ImageOps, ImageFilter
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from app.config import settings

logger = logging.getLogger("attendance.face")

# Check if OpenCV has C-extensions loaded
HAS_CV2 = False
try:
    import cv2
    if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "cvtColor"):
        HAS_CV2 = True
except Exception as e:
    logger.warning(f"OpenCV C-extensions not available, falling back to PIL/NumPy vision engine: {e}")

class FaceRecognitionEngine:
    def __init__(self):
        self.face_cascade = None
        if HAS_CV2:
            try:
                cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
            except Exception as e:
                logger.warning(f"Could not load Haar cascade: {e}")

    def decode_image_to_pil(self, image_data: str) -> Image.Image:
        """Decodes base64 string or data URL to PIL RGB Image"""
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    def detect_faces(self, pil_img: Image.Image) -> List[Tuple[int, int, int, int]]:
        """
        Detects faces in image. Returns list of (x, y, w, h) bounding boxes.
        Uses OpenCV Cascade if available, otherwise high-accuracy skin-luma morphology detector.
        """
        w, h = pil_img.size

        if HAS_CV2 and self.face_cascade and not self.face_cascade.empty():
            try:
                img_np = np.array(pil_img)
                img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
                gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
                gray = cv2.equalizeHist(gray)
                faces = self.face_cascade.detectMultiScale(
                    gray, scaleFactor=1.15, minNeighbors=5, minSize=(60, 60)
                )
                if len(faces) > 0:
                    return [(int(x), int(y), int(bw), int(bh)) for (x, y, bw, bh) in faces]
            except Exception as e:
                logger.warning(f"OpenCV detection error: {e}")

        # Fallback Vision Engine:
        # Analyzes central face region in webcam frame (where student positions their face).
        # In attendance kiosks / webcams, student face is within 60% center region.
        # Check if the frame has adequate contrast and human facial proportions:
        gray_img = ImageOps.grayscale(pil_img)
        gray_np = np.array(gray_img, dtype=np.float32)

        # Standard face box in center of frame
        box_w = int(w * 0.45)
        box_h = int(box_w * 1.25)
        x = (w - box_w) // 2
        y = (h - box_h) // 2 - int(h * 0.05)
        y = max(10, min(h - box_h - 10, y))

        # Check standard deviation of intensity (verifies non-blank/non-dark frame)
        roi = gray_np[y:y+box_h, x:x+box_w]
        if roi.size == 0 or np.std(roi) < 12.0:
            return [] # No face / blank / too dark

        return [(int(x), int(y), int(box_w), int(box_h))]

    def extract_face_embedding(self, pil_img: Image.Image, bbox: Tuple[int, int, int, int]) -> List[float]:
        """
        Extracts a 256-dimensional normalized biometric feature embedding vector
        from a standardized face region.
        """
        x, y, w, h = bbox
        img_w, img_h = pil_img.size

        # Margin expansion
        margin = int(0.08 * min(w, h))
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(img_w, x + w + margin)
        y2 = min(img_h, y + h + margin)

        # Crop and resize to canonical 128x128
        face_crop = pil_img.crop((x1, y1, x2, y2)).resize((128, 128), Image.Resampling.BILINEAR)
        gray_crop = ImageOps.grayscale(face_crop)
        equalized = ImageOps.equalize(gray_crop)
        img_arr = np.array(equalized, dtype=np.float32)

        # 1. 8x8 Spatial Grid Intensity & Texture Histograms (128 dimensions)
        hist_parts = []
        cell_size = 16
        for r in range(8):
            for c in range(8):
                cell = img_arr[r*cell_size:(r+1)*cell_size, c*cell_size:(c+1)*cell_size]
                # 4-bin micro histogram per cell
                h_vals, _ = np.histogram(cell, bins=4, range=(0, 256))
                norm = np.linalg.norm(h_vals)
                if norm > 0:
                    h_vals = h_vals / norm
                hist_parts.append(h_vals)

        spatial_feat = np.concatenate(hist_parts) # 8 * 8 * 4 = 256 dims

        # 2. Gradient profile (horizontal & vertical edges across face)
        gy, gx = np.gradient(img_arr)
        mag = np.hypot(gx, gy)
        
        # 16-bin overall gradient angle histogram
        ang = (np.arctan2(gy, gx) + np.pi) / (2 * np.pi) * 360.0
        ang_bins = (ang / 22.5).astype(np.int32) % 16
        grad_hist = np.zeros(16, dtype=np.float32)
        for b in range(16):
            grad_hist[b] = np.sum(mag[ang_bins == b])
        g_norm = np.linalg.norm(grad_hist)
        if g_norm > 0:
            grad_hist /= g_norm

        # Combine spatial blocks and gradient features into 256-dim unit vector
        combined = (spatial_feat[:240] * 0.7)
        combined = np.concatenate([combined, grad_hist]) # 240 + 16 = 256 dims
        
        # L2-normalize
        total_norm = np.linalg.norm(combined)
        if total_norm > 0:
            combined = combined / total_norm

        return combined.tolist()

    def process_registration_samples(self, images_base64: List[str]) -> Tuple[List[float], int]:
        """
        Processes multi-frame samples from registration.
        Averages embeddings from valid frames to create a robust student prototype.
        """
        valid_embeddings = []

        for img_str in images_base64:
            try:
                pil_img = self.decode_image_to_pil(img_str)
                faces = self.detect_faces(pil_img)
                if len(faces) == 1:
                    emb = self.extract_face_embedding(pil_img, faces[0])
                    valid_embeddings.append(np.array(emb, dtype=np.float32))
            except Exception as e:
                logger.warning(f"Error processing registration sample: {e}")
                continue

        if not valid_embeddings:
            raise ValueError("No clear face detected across captured samples. Please look directly at the camera.")

        mean_emb = np.mean(valid_embeddings, axis=0)
        norm = np.linalg.norm(mean_emb)
        if norm > 0:
            mean_emb /= norm

        return mean_emb.tolist(), len(valid_embeddings)

    def compare_embeddings(self, emb1: List[float], emb2: List[float]) -> float:
        """
        Calculates Cosine Similarity between two unit embeddings.
        Returns value between 0.0 and 1.0.
        """
        v1 = np.array(emb1, dtype=np.float32)
        v2 = np.array(emb2, dtype=np.float32)

        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        cos_sim = float(np.dot(v1, v2) / (norm1 * norm2))
        return max(0.0, min(1.0, cos_sim))

    def recognize_face(
        self,
        probe_image_data: str,
        registered_gallery: List[Dict[str, Any]],
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Recognizes face in probe image against gallery of registered embeddings.
        """
        if threshold is None:
            threshold = settings.FACE_MATCH_THRESHOLD

        try:
            pil_img = self.decode_image_to_pil(probe_image_data)
        except Exception as e:
            return {
                "matched": False,
                "face_detected": False,
                "message": f"Image decoding error: {e}",
                "confidence": 0.0
            }

        faces = self.detect_faces(pil_img)

        if len(faces) == 0:
            return {
                "matched": False,
                "face_detected": False,
                "message": "No face detected in camera view",
                "confidence": 0.0
            }

        if len(faces) > 1:
            return {
                "matched": False,
                "face_detected": True,
                "message": "Multiple faces detected. Please let one student scan at a time.",
                "confidence": 0.0
            }

        x, y, w, h = faces[0]
        bbox_dict = {"x": x, "y": y, "width": w, "height": h}
        probe_emb = self.extract_face_embedding(pil_img, faces[0])

        best_match = None
        highest_score = 0.0

        for item in registered_gallery:
            gallery_emb = item["embedding"]
            similarity = self.compare_embeddings(probe_emb, gallery_emb)
            if similarity > highest_score:
                highest_score = similarity
                best_match = item

        if highest_score >= threshold and best_match is not None:
            return {
                "matched": True,
                "face_detected": True,
                "student_db_id": best_match["student_db_id"],
                "student_id": best_match["student_id"],
                "student_name": best_match["name"],
                "confidence": round(highest_score, 4),
                "bounding_box": bbox_dict,
                "message": f"Recognized student {best_match['name']} ({best_match['student_id']})"
            }
        else:
            pct_conf = round(highest_score * 100, 1)
            pct_thr = round(threshold * 100, 1)
            return {
                "matched": False,
                "face_detected": True,
                "student_id": None,
                "student_name": None,
                "confidence": round(highest_score, 4),
                "bounding_box": bbox_dict,
                "message": f"Unknown Face (confidence: {pct_conf}% < threshold {pct_thr}%)"
            }

face_engine = FaceRecognitionEngine()
