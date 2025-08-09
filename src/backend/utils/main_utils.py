from PIL import Image, ImageFilter
from rembg import remove
import os
import cv2
from deepface import DeepFace
import random
import uuid

# --- Constants and Global Variables (Load once) ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
OUTPUT_DIR = os.path.join(BASE_DIR, "static", "generated_cards")

# Load models and templates once at startup
os.makedirs(OUTPUT_DIR, exist_ok=True)
CANVAS_PATHS = [os.path.join(TEMPLATES_DIR, f"canvas{i}.jpg") for i in range(1, 6)]
FACE_CASCADE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def get_card(input_image_path, upward_shift_ratio=0.1, glow_color=(255, 255, 0)):
    """
    Removes the background, adds a glow, and composites the image onto a canvas.
    Saves the result as a PNG to preserve transparency.
    """
    if not os.path.exists(input_image_path):
        raise FileNotFoundError(f"Image file not found: {input_image_path}")

    # Remove background
    with Image.open(input_image_path) as input_image:
        input_image = input_image.convert("RGBA")
        no_bg_image = remove(input_image)

    # Pick a random canvas
    canvas_image_path = random.choice(CANVAS_PATHS)

    # Create mask & glow
    mask = no_bg_image.getchannel("A")
    feathered_mask = mask.filter(ImageFilter.GaussianBlur(radius=10))
    # Note: The alpha component is set by putalpha later
    glow = Image.new("RGBA", no_bg_image.size, glow_color + (0,))
    glow.putalpha(feathered_mask)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=5))

    # Composite on canvas
    with Image.open(canvas_image_path) as canvas:
        canvas = canvas.convert("RGBA")
        canvas_width, canvas_height = canvas.size

        target_height = int(canvas_height * 0.8)
        aspect_ratio = no_bg_image.width / no_bg_image.height
        new_width = int(target_height * aspect_ratio)

        resized_image = no_bg_image.resize((new_width, target_height), Image.LANCZOS)
        resized_glow = glow.resize((new_width, target_height), Image.LANCZOS)

        x = (canvas_width - new_width) // 2
        y = (canvas_height - target_height) // 2 - int(canvas_height * upward_shift_ratio)

        canvas.alpha_composite(resized_glow, (x, y))
        canvas.alpha_composite(resized_image, (x, y))

        # ❗ CRITICAL FIX: Save as PNG to preserve transparency
        output_filename = f"{uuid.uuid4()}.png"
        output_image_path = os.path.join(OUTPUT_DIR, output_filename)
        canvas.save(output_image_path, "PNG")

    return output_image_path


def get_score(image_path):
    """
    Detects the largest face and returns a normalized excitement score (70–100).
    Uses a pre-loaded face detection model for efficiency.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    padding = 1.2
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ✨ PERFORMANCE FIX: Use the globally loaded cascade
    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4)

    if not faces.any():
        return 70.0  # No face detected

    # Find the largest face
    x, y, w, h = max(faces, key=lambda rect: rect[2] * rect[3])

    pad_w = int(w * (padding - 1) / 2)
    pad_h = int(h * (padding - 1) / 2)
    x1, y1 = max(0, x - pad_w), max(0, y - pad_h)
    x2, y2 = min(img.shape[1], x + w + pad_w), min(img.shape[0], y + h + pad_h)

    face_img = img[y1:y2, x1:x2]

    # Analyze emotions
    result = DeepFace.analyze(face_img, actions=['emotion'], enforce_detection=False)
    emotions = result[0]['emotion']
    raw_score = emotions.get('happy', 0)

    # Normalize score to the 70–100 range
    return 70 + (raw_score / 100) * 30