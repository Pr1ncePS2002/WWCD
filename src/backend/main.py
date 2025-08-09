from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import shutil
import uuid
import os
from main_utils import get_score, get_card

app = FastAPI(title="Alfahm Chest Piece Decider API")

# Allow all origins for simplicity in local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory and mount static directory
os.makedirs("temp_uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.post("/predict-winners")
async def predict_winners(images: List[UploadFile] = File(...)):
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
            filename = os.path.basename(card_path)  # get just "942bf34d.png"
            file_url = f"http://localhost:8000/static/generated_cards/{filename}"
            winner_cards.append(file_url)

        return winner_cards

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)