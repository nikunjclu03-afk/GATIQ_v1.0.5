/* ============================================================
   camera.js — Webcam & Image Upload Handler
   No image saving — just capture for scanning
   ============================================================ */

const Camera = (() => {
    let stream = null;
    let isActive = false;

    const elements = {};

    function init() {
        elements.video = document.getElementById('cameraFeed');
        elements.canvas = document.getElementById('captureCanvas');
        elements.uploadedImg = document.getElementById('uploadedImage');
        elements.placeholder = document.getElementById('cameraPlaceholder');
    }

    /**
     * Start webcam feed
     */
    async function startCamera() {
        init();
        try {
            // Stop any existing stream
            stopCamera();

            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            // Only add facingMode if we are NOT in a desktop app or if it's explicitly desired
            // On desktop, 'environment' often fails if there's only one camera.
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    ...constraints,
                    video: { ...constraints.video, facingMode: 'environment' }
                });
            } catch (e) {
                console.warn('FacingMode environment failed, trying default camera:', e);
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
            }

            elements.video.srcObject = stream;
            elements.video.style.display = 'block';
            elements.uploadedImg.style.display = 'none';
            elements.placeholder.classList.add('hidden');
            isActive = true;

            return true;
        } catch (err) {
            console.error('Camera error:', err);
            throw new Error('Could not access camera. Please allow camera permission or upload an image.');
        }
    }

    /**
     * Stop webcam feed
     */
    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        isActive = false;
        if (elements.video) {
            elements.video.srcObject = null;
        }
    }

    /**
     * Capture current frame from video as base64
     * Returns base64 string (without data: prefix)
     */
    function captureFrame() {
        init();
        if (!isActive || !stream) {
            throw new Error('Camera is not active.');
        }

        const video = elements.video;
        const canvas = elements.canvas;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // Get base64 (strip the data:image/jpeg;base64, prefix)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        return {
            mimeType: 'image/jpeg',
            base64: dataUrl.split(',')[1]
        };
    }

    /**
     * Handle uploaded image file
     * Returns promise with base64 string
     */
    function handleImageUpload(file) {
        init();
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Please upload a valid image file.'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;

                // Show image in preview
                elements.uploadedImg.src = dataUrl;
                elements.uploadedImg.style.display = 'block';
                elements.video.style.display = 'none';
                elements.placeholder.classList.add('hidden');

                // Stop camera if running
                stopCamera();

                // Extract mimeType from data URL
                const mimeType = dataUrl.substring(5, dataUrl.indexOf(';'));

                // Return payload
                resolve({
                    mimeType: mimeType || 'image/jpeg',
                    base64: dataUrl.split(',')[1]
                });
            };
            reader.onerror = () => reject(new Error('Failed to read image file.'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Get current image as base64 (from either camera or uploaded image)
     */
    function getCurrentImage() {
        init();
        if (isActive && stream) {
            return captureFrame();
        }

        // Check if we have an uploaded image
        if (elements.uploadedImg && elements.uploadedImg.style.display !== 'none' && elements.uploadedImg.src) {
            const src = elements.uploadedImg.src;
            if (src.startsWith('data:')) {
                const mimeType = src.substring(5, src.indexOf(';'));
                return {
                    mimeType: mimeType || 'image/jpeg',
                    base64: src.split(',')[1]
                };
            }
        }

        throw new Error('No image available. Start camera or upload an image first.');
    }

    /**
     * Check if camera or image is ready
     */
    function isReady() {
        init();
        if (isActive && stream) return true;
        if (elements.uploadedImg && elements.uploadedImg.style.display !== 'none' && elements.uploadedImg.src) return true;
        return false;
    }

    return {
        startCamera,
        stopCamera,
        captureFrame,
        handleImageUpload,
        getCurrentImage,
        isReady
    };
})();

if (typeof window !== 'undefined') {
    window.Camera = Camera;
}
