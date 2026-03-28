from roboflow import Roboflow
import os

# Initialize Roboflow with the Private API Key
rf = Roboflow(api_key="Vaq2GKQGHcQswBYL01Ul")

workspace = rf.workspace("nikunjs-workspace-zzhuu")
project = workspace.project("indian-number-plate-ner1u")

# Let's see what versions are actually available
versions = project.versions()
if not versions:
    print("No versions found! Let's try to download version 1 or the latest one.")
    # If no version exists, you might need to generate one in the Roboflow UI first.
else:
    print(f"Available versions: {[v.version for v in versions]}")
    latest_version = versions[0].version
    print(f"Attempting to download latest version: {latest_version}")

    target_dir = os.path.join(os.getcwd(), "QAT_Dataset")
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    dataset = project.version(latest_version).download("yolov8", location=target_dir)
    print("Download complete!")
