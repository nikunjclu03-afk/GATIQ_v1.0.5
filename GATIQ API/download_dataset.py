from roboflow import Roboflow
import os

# Initialize Roboflow with the Private API Key from screenshot
rf = Roboflow(api_key="Vaq2GKQGHcQswBYL01Ul")
# Using the workspace and project found in the screenshot/search
project = rf.workspace("nikunjs-workspace-zzhuu").project("number-plate-recognition-iy76y")

# Set the target directory
target_dir = os.path.join(os.getcwd(), "QAT_Dataset")
if not os.path.exists(target_dir):
    os.makedirs(target_dir)

# Download the dataset in YOLOv8 format
print(f"Downloading dataset to {target_dir}...")
dataset = project.version(4).download("yolov8", location=target_dir)
print("Download complete!")
