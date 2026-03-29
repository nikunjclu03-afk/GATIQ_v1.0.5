with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

target = '<script src="js/app.js" defer></script>'
replacement = '''<script src="js/review-queue.js" defer></script>
    <script src="js/camera-health.js" defer></script>
    <script src="js/app.js" defer></script>'''

if target in content:
    new_content = content.replace(target, replacement)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added review-queue.js and camera-health.js")
else:
    print("Target tag not found in index.html.")
