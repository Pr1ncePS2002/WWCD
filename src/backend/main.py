from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import shutil
import uuid
import os
from main_utils import get_score, get_card

app = FastAPI(title="Alfahm Chest Piece Decider API")

# Allow specific origins for production and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://wwcd-git-main-princes-projects-bb0ae716.vercel.app", # Vercel frontend
        "http://localhost:3000",  # Local development environment
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory and mount static directory with a name
os.makedirs("temp_uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.post("/predict-winners")
async def predict_winners(request: Request, images: List[UploadFile] = File(...)):
    if len(images) not in [2, 4]:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 2 or 4 images, but received {len(images)}"
        )
    
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
    for image in images:
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Only images are allowed."
            )

    image_scores = []
    temp_paths = []

    try:
        for image in images:
            file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join("temp_uploads", unique_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            temp_paths.append(file_path)
            
            excitement_score = get_score(file_path)
            image_scores.append({
                "path": file_path,
                "score": excitement_score
            })

        image_scores.sort(key=lambda x: x["score"], reverse=True)
        num_winners = 1 if len(images) == 2 else 2
        winners = image_scores[:num_winners]

        winner_cards = []
        for winner in winners:
            card_path = get_card(winner["path"])
            filename = os.path.basename(card_path)
            
            # --- FIX: Generate URL dynamically based on the request ---
            file_url = request.url_for('static', path=f"generated_cards/{filename}")
            winner_cards.append(str(file_url)) # Convert URL object to string

        return winner_cards

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)

if __name__ == "__main__":
    import uvicorn
    # --- FIX: Use PORT from environment variable for deployment, with a fallback for local dev ---
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)