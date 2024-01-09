from PIL import Image
# import image
import numpy as np

image = Image.open("image.png")
# Image.open("image.png").convert('RGBA').save("image.bmp")

image_data = np.asarray(image)
print(image_data)

