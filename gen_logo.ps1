$bytes = [System.IO.File]::ReadAllBytes("c:\Users\DELL\Desktop\PDF Genrator AI\img\about_logo-removebg-preview.png")
$b64 = [System.Convert]::ToBase64String($bytes)
$jsContent = "const PDF_LOGO_BASE64 = 'data:image/png;base64," + $b64 + "';"
[System.IO.File]::WriteAllText("c:\Users\DELL\Desktop\PDF Genrator AI\js\logo-data.js", $jsContent, [System.Text.Encoding]::UTF8)
Write-Host "Done! logo-data.js created."
