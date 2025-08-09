from PIL import Image, ImageFilter, ImageOps
from rembg import remove
import os

def process_image(input_image_path, canvas_image_path, output_image_path, upward_shift_ratio=0.1):
    """
    Removes the background from an input image, adds a feathered edge and a
    yellow glow, resizes it to a fixed height, and composites it onto a canvas.
    
    Args:
        input_image_path (str): Path to the input image (with subject).
        canvas_image_path (str): Path to the background/card canvas image.
        output_image_path (str): Path to save the final composited image.
        upward_shift_ratio (float): How much higher (as fraction of canvas height) to place the image.
    """

    with Image.open(input_image_path) as input_image:
        input_image = input_image.convert("RGBA")
        no_bg_image = remove(input_image)

    # Create a mask and feather it
    mask = no_bg_image.getchannel("A")
    feathered_mask = mask.filter(ImageFilter.GaussianBlur(radius=10))

    # Add glow effect by expanding the alpha channel
    glow = Image.new("RGBA", no_bg_image.size, (255, 255, 0, 0))
    glow.putalpha(feathered_mask)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=35))

    with Image.open(canvas_image_path) as canvas:
        canvas = canvas.convert("RGBA")
        canvas_width, canvas_height = canvas.size

        target_height = int(canvas_height * 0.8)  
        aspect_ratio = no_bg_image.width / no_bg_image.height
        new_height = target_height
        new_width = int(new_height * aspect_ratio)

        resized_image = no_bg_image.resize((new_width, new_height), Image.LANCZOS)
        resized_glow = glow.resize((new_width, new_height), Image.LANCZOS)

        x = (canvas_width - new_width) // 2
        y = (canvas_height - new_height) // 2 - int(canvas_height * upward_shift_ratio)

        # Composite everything onto the canvas
        canvas.alpha_composite(resized_glow, (x, y))
        canvas.alpha_composite(resized_image, (x, y))

        canvas.save(output_image_path)

# if __name__ == "__main__":

#     input_image_path = "z.jpeg"
#     canvas_image_path = "canvas.jpg"
#     output_image_path = "final_output.png"

#     # Move subject 10% higher than center
#     process_image(input_image_path, canvas_image_path, output_image_path, upward_shift_ratio=0.1)
