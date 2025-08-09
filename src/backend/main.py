from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import shutil
from typing import List
import uuid
import random

app = FastAPI(title="Alfahm Chest Piece Decider API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp_uploads directory if it doesn't exist
os.makedirs("temp_uploads", exist_ok=True)
os.makedirs("static/generated_cards", exist_ok=True)

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

def calculate_excitement_score(image_path: str) -> float:
    """
    Mock implementation of calculate_excitement_score function.
    In a real implementation, this would use ML/AI to analyze the image.
    
    Args:
        image_path: Path to the uploaded image file
        
    Returns:
        Float between 0 and 100 representing excitement score
    """
    # Verify file exists
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Mock score calculation - in real implementation this would be ML-based
    # Generate a realistic score between 60-100
    base_score = random.uniform(60.0, 95.0)
    
    # Add some variability based on file size (larger files might be higher quality)
    try:
        file_size = os.path.getsize(image_path)
        size_bonus = min(5.0, file_size / (1024 * 1024))  # Up to 5 points for larger files
        final_score = min(100.0, base_score + size_bonus)
    except:
        final_score = base_score
    
    return round(final_score, 1)

def generate_winner_card(image_path: str) -> str:
    """
    Mock implementation of generate_winner_card function.
    In a real implementation, this would generate a professional football-style winner card.
    
    Args:
        image_path: Path to the original image file
        
    Returns:
        Publicly accessible URL of the generated winner card
    """
    # Verify file exists
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Mock card generation - in real implementation this would create an actual card
    card_filename = f"winner_card_{uuid.uuid4()}.png"
    
    # Mock some popular stock images for different card styles
    mock_cards = [
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        "https://images.unsplash.com/photo-1544198365-f5d60b6d8190?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
        "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"
    ]
    
    # Return a random mock card URL
    return random.choice(mock_cards)

@app.post("/predict-winners")
async def predict_winners(images: List[UploadFile] = File(...)):
    """
    Accept exactly 4 uploaded images, calculate excitement scores,
    and return winner cards for the top 2 designs.
    """
    
    # Validate exactly 4 images
    if len(images) != 4:
        raise HTTPException(
            status_code=400,
            detail=f"Expected exactly 4 images, but received {len(images)}"
        )
    
    # Validate file types
    allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
    for image in images:
        if image.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type: {image.content_type}. Only images are allowed."
            )
    
    image_scores = []
    
    try:
        # Process each uploaded image
        for i, image in enumerate(images):
            # Generate unique filename
            file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            file_path = os.path.join("temp_uploads", unique_filename)
            
            # Save uploaded file temporarily
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            # Calculate excitement score
            try:
                excitement_score = calculate_excitement_score(file_path)
                image_scores.append({
                    "filename": unique_filename,
                    "original_name": image.filename,
                    "path": file_path,
                    "score": excitement_score
                })
            except Exception as e:
                # Clean up uploaded file on error
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(
                    status_code=500,
                    detail=f"Error calculating excitement score for {image.filename}: {str(e)}"
                )
        
        # Sort by excitement score in descending order
        image_scores.sort(key=lambda x: x["score"], reverse=True)
        
        # Select top 2 winners
        winners = image_scores[:2]
        
        # Generate winner cards
        winner_cards = {}
        for i, winner in enumerate(winners, 1):
            try:
                card_url = generate_winner_card(winner["path"])
                winner_cards[f"winner{i}_card_url"] = card_url
                winner_cards[f"winner{i}_score"] = winner["score"]
                winner_cards[f"winner{i}_filename"] = winner["original_name"]
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error generating winner card for {winner['original_name']}: {str(e)}"
                )
        
        # Clean up temporary files
        for image_data in image_scores:
            if os.path.exists(image_data["path"]):
                os.remove(image_data["path"])
        
        return JSONResponse(content=winner_cards)
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Clean up any remaining temporary files
        for image_data in image_scores:
            if os.path.exists(image_data["path"]):
                os.remove(image_data["path"])
        
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Alfahm Chest Piece Decider API is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting FastAPI server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

