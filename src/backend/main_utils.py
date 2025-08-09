import os
import sys
import uuid
import random
import cv2
from PIL import Image, ImageFilter
from rembg import remove
from deepface import DeepFace

# --- Environment and Global Variables ---
BACKEND_API_URL = os.environ.get("BACKEND_API_URL", "http://localhost:8000")
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
    glow = Image.new("RGBA", no_bg_image.size, glow_color + (0,))
    glow.putalpha(feathered_mask)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=35))

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
        
        output_filename = f"{uuid.uuid4()}.png"
        output_image_path = os.path.join(OUTPUT_DIR, output_filename)
        canvas.save(output_image_path, "PNG")

    # Return a full URL that points to the FastAPI backend's static file server
    full_url = f"{BACKEND_API_URL}/static/generated_cards/{output_filename}"
    return full_url


def get_score(image_path):
    """
    Detects the largest face and returns a normalized excitement score (70–100).
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")

    padding = 1.2
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if FACE_CASCADE.empty():
        raise RuntimeError("Face cascade classifier is not loaded.")

    faces = FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4)

    if len(faces) == 0:
        return 70.0 # No face detected
    
    x, y, w, h = max(faces, key=lambda rect: rect[2] * rect[3])
    pad_w = int(w * (padding - 1) / 2)
    pad_h = int(h * (padding - 1) / 2)
    x1, y1 = max(0, x - pad_w), max(0, y - pad_h)
    x2, y2 = min(img.shape[1], x + w + pad_w), min(img.shape[0], y + h + pad_h)
    face_img = img[y1:y2, x1:x2]

    try:
        result = DeepFace.analyze(face_img, actions=['emotion'], enforce_detection=False)
        emotions = result[0]['emotion']
        raw_score = emotions.get('happy', 0)
    except Exception as e:
        print(f"DeepFace analysis failed: {e}", file=sys.stderr)
        return 70.0 # Default score on failure

    # Normalize score to the 70–100 range
    return 70 + (raw_score / 100) * 30