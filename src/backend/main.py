from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
import shutil
import uuid
import os
from main_utils import get_score, get_card

app = FastAPI(title="Alfahm Chest Piece Decider API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
os.makedirs("temp_uploads", exist_ok=True)
# os.makedirs("static/generated_cards", exist_ok=True)

# Mount static directory
# app.mount("/static", StaticFiles(directory="static"), name="static")

@app.post("/predict-winners")
async def predict_winners(images: List[UploadFile] = File(...)):
    """
    Accept 2 or 4 uploaded images.
    - If 2 images, return the top 1 winner.
    - If 4 images, return the top 2 winners.
    """
    
    if len(images) not in [2, 4]:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 2 or 4 images, but received {len(images)}"
        )

    # Validate content types
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
    for image in images:
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Only images are allowed."
            )

    image_scores = []
    temp_paths = []  # Track all temp files for cleanup

    try:
        # Save and score each image
        for image in images:
            file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join("temp_uploads", unique_filename)

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            temp_paths.append(file_path)
            
            try:
                excitement_score = get_score(file_path)
                image_scores.append({
                    "filename": unique_filename,
                    "original_name": image.filename,
                    "path": file_path,
                    "score": excitement_score
                })
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error calculating excitement score for {image.filename}: {str(e)}"
                )

        image_scores.sort(key=lambda x: x["score"], reverse=True)

        num_winners = 1 if len(images) == 2 else 2
        winners = image_scores[:num_winners]

        winner_cards = []
        for winner in winners:
            try:
                card_url = get_card(winner["path"])
                winner_cards.append(card_url)
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error generating winner card for {winner['original_name']}: {str(e)}"
                )

        return winner_cards

    except HTTPException:
        raise 
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    finally:
        for path in temp_paths:
            if os.path.exists(path):
                os.remove(path)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Alfahm Chest Piece Decider API is running"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting FastAPI server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)