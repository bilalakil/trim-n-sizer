class TrimNSizer {
    constructor() {
        this.currentFile = null;
        this.videoData = null;
        this.videoDuration = 0;
        this.trimStart = 0;
        this.trimEnd = 0;
        this.originalWidth = 0;
        this.originalHeight = 0;
        this.selectedFormat = 'mp4';
        this.selectedScale = 1.0;
        this.targetSize = 10; // MB
        this.targetFramerate = 15; // fps for GIF
        this.isProcessing = false;

        // WebCodecs support detection
        this.webCodecsSupported = false;
        this.ffmpeg = null;

        this.initializeElements();
        this.checkWebCodecsSupport();
        this.setupEventListeners();
    }

    initializeElements() {
        // File input elements
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');

        // Video elements
        this.videoContainer = document.getElementById('videoContainer');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoInfo = document.getElementById('videoInfo');

        // Control elements
        this.controlsSection = document.getElementById('controlsSection');
        this.mp4Format = document.getElementById('mp4Format');
        this.gifFormat = document.getElementById('gifFormat');
        this.mp4Controls = document.getElementById('mp4Controls');
        this.gifControls = document.getElementById('gifControls');
        this.originalResolution = document.getElementById('originalResolution');

        // Timeline elements
        this.timelineContainer = document.getElementById('timelineContainer');
        this.timeline = document.getElementById('timeline');
        this.timelineSelection = document.getElementById('timelineSelection');
        this.startHandle = document.getElementById('startHandle');
        this.endHandle = document.getElementById('endHandle');
        this.startTime = document.getElementById('startTime');
        this.endTime = document.getElementById('endTime');
        this.duration = document.getElementById('duration');

        // Input elements
        this.sizeInput = document.getElementById('sizeInput');
        this.framerateInput = document.getElementById('framerateInput');

        // Process elements
        this.renderBtn = document.getElementById('renderBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.errorMessage = document.getElementById('errorMessage');
        this.webCodecsWarning = document.getElementById('webCodecsWarning');
    }

    checkWebCodecsSupport() {
        this.webCodecsSupported = (
            'VideoEncoder' in window &&
            'VideoDecoder' in window &&
            'VideoFrame' in window &&
            'EncodedVideoChunk' in window
        );

        if (!this.webCodecsSupported) {
            this.webCodecsWarning.style.display = 'block';
            console.log('WebCodecs not supported, will use FFmpeg.wasm fallback');
        } else {
            this.webCodecsWarning.style.display = 'none';
            console.log('WebCodecs API supported');
        }
    }

    setupEventListeners() {
        // File input events
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropZone.addEventListener('click', () => {
            if (!this.dropZone.classList.contains('has-video')) {
                this.fileInput.click();
            }
        });
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Paste event for file input
        document.addEventListener('paste', this.handlePaste.bind(this));

        // Global drag and drop events for entire webpage
        document.addEventListener('dragenter', this.handleGlobalDragEnter.bind(this));
        document.addEventListener('dragover', this.handleGlobalDragOver.bind(this));
        document.addEventListener('dragleave', this.handleGlobalDragLeave.bind(this));
        document.addEventListener('drop', this.handleGlobalDrop.bind(this));

        // Format selection
        this.mp4Format.addEventListener('click', () => this.selectFormat('mp4'));
        this.gifFormat.addEventListener('click', () => this.selectFormat('gif'));

        // Resolution selection
        document.querySelectorAll('.resolution-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectResolution(parseFloat(e.target.dataset.scale));
            });
        });

        // Size presets (MP4)
        document.querySelectorAll('[data-size]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sizeInput.value = e.target.dataset.size;
                this.targetSize = parseFloat(e.target.dataset.size);
            });
        });

        // Framerate presets (GIF)
        document.querySelectorAll('[data-framerate]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.framerateInput.value = e.target.dataset.framerate;
                this.targetFramerate = parseInt(e.target.dataset.framerate);
            });
        });

        // Input changes
        this.sizeInput.addEventListener('input', (e) => {
            this.targetSize = parseFloat(e.target.value) || 10;
        });

        this.framerateInput.addEventListener('input', (e) => {
            this.targetFramerate = parseInt(e.target.value) || 15;
        });

        // Video events
        this.videoPlayer.addEventListener('loadedmetadata', this.handleVideoLoaded.bind(this));
        this.videoPlayer.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));

        // Timeline events
        this.timeline.addEventListener('click', this.handleTimelineClick.bind(this));
        this.startHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.startDrag(e, 'end'));

        // Process button
        this.renderBtn.addEventListener('click', this.processVideo.bind(this));
    }

    // File handling methods
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        const videoFile = files.find(file => file.type.startsWith('video/'));

        if (videoFile) {
            this.loadVideo(videoFile);
        } else {
            this.showError('Please drop a valid video file.');
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            this.loadVideo(file);
        }
    }

    handlePaste(e) {
        const items = Array.from(e.clipboardData.items);
        const videoItem = items.find(item => item.type.startsWith('video/'));

        if (videoItem) {
            const file = videoItem.getAsFile();
            this.loadVideo(file);
        }
    }

    // Global drag and drop handlers for entire webpage
    handleGlobalDragEnter(e) {
        // Prevent default browser behavior for all file drops
        e.preventDefault();
    }

    handleGlobalDragOver(e) {
        // Check if dragged items include video files
        const hasVideo = Array.from(e.dataTransfer.types).some(type => 
            type === 'Files' || type.includes('video')
        );
        
        if (hasVideo) {
            e.preventDefault(); // Allow drop
            e.dataTransfer.dropEffect = 'copy';
            
            // Add visual feedback to drop zone
            this.dropZone.classList.add('drag-over');
            
            // Add visual feedback to entire page
            document.body.style.backgroundColor = '#2a3444';
        }
    }

    handleGlobalDragLeave(e) {
        // Only remove feedback when leaving the entire document
        if (e.relatedTarget === null || !document.contains(e.relatedTarget)) {
            this.dropZone.classList.remove('drag-over');
            document.body.style.backgroundColor = '';
        }
    }

    handleGlobalDrop(e) {
        e.preventDefault();
        
        // Remove visual feedback
        this.dropZone.classList.remove('drag-over');
        document.body.style.backgroundColor = '';

        const files = Array.from(e.dataTransfer.files);
        const videoFile = files.find(file => file.type.startsWith('video/'));

        if (videoFile) {
            this.loadVideo(videoFile);
        } else if (files.length > 0) {
            // Show error only if files were dropped but none were video
            this.showError('Please drop a valid video file.');
        }
    }

    loadVideo(file) {
        this.currentFile = file;
        this.hideError();

        // Clean up previous video URL if it exists
        if (this.videoPlayer.src && this.videoPlayer.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.videoPlayer.src);
        }

        // Create object URL for video player
        const videoUrl = URL.createObjectURL(file);
        this.videoPlayer.src = videoUrl;

        // Update UI
        this.dropZone.classList.add('has-video');
        this.videoContainer.style.display = 'block';
        this.controlsSection.style.display = 'block';

        // Reset timeline
        this.resetTimeline();
    }

    handleVideoLoaded() {
        this.videoDuration = this.videoPlayer.duration;
        this.originalWidth = this.videoPlayer.videoWidth;
        this.originalHeight = this.videoPlayer.videoHeight;

        console.log(`Video loaded - Duration: ${this.videoDuration}s, Size: ${this.originalWidth}x${this.originalHeight}`);

        // Update UI with video info
        this.videoInfo.textContent = `${this.originalWidth}×${this.originalHeight} • ${this.formatTime(this.videoDuration)}`;
        this.originalResolution.textContent = `Original: ${this.originalWidth}×${this.originalHeight}`;

        // Initialize timeline
        this.trimStart = 0;
        this.trimEnd = this.videoDuration;
        console.log(`Timeline initialized - Start: ${this.trimStart}s, End: ${this.trimEnd}s`);

        this.timelineContainer.style.display = 'block';
        
        // Delay timeline update to ensure element dimensions are calculated
        setTimeout(() => {
            this.updateTimeline();
        }, 50);

        // Enable render button
        this.renderBtn.disabled = false;
    }

    // Timeline methods
    resetTimeline() {
        this.trimStart = 0;
        this.trimEnd = this.videoDuration || 0;
        this.updateTimeline();
    }

    updateTimeline() {
        if (this.videoDuration === 0) return;

        const timelineWidth = this.timeline.offsetWidth - 20; // Account for padding
        const startPercent = (this.trimStart / this.videoDuration) * 100;
        const endPercent = (this.trimEnd / this.videoDuration) * 100;

        console.log(`Timeline update - Duration: ${this.videoDuration}s, Start: ${this.trimStart}s (${startPercent.toFixed(1)}%), End: ${this.trimEnd}s (${endPercent.toFixed(1)}%)`);

        // Update handles
        this.startHandle.style.left = `${10 + (startPercent / 100) * timelineWidth}px`;
        this.endHandle.style.left = `${10 + (endPercent / 100) * timelineWidth}px`;

        // Update selection
        this.timelineSelection.style.left = `${10 + (startPercent / 100) * timelineWidth}px`;
        this.timelineSelection.style.width = `${((endPercent - startPercent) / 100) * timelineWidth}px`;

        // Update time displays
        this.startTime.textContent = this.formatTime(this.trimStart);
        this.endTime.textContent = this.formatTime(this.trimEnd);
        this.duration.textContent = this.formatTime(this.trimEnd - this.trimStart);
    }

    handleTimelineClick(e) {
        if (this.videoDuration === 0) return;

        const rect = this.timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left - 10; // Account for padding
        const timelineWidth = rect.width - 20;
        const clickPercent = Math.max(0, Math.min(1, clickX / timelineWidth));
        const clickTime = clickPercent * this.videoDuration;

        // Determine whether to move start or end handle based on proximity
        const distToStart = Math.abs(clickTime - this.trimStart);
        const distToEnd = Math.abs(clickTime - this.trimEnd);

        if (distToStart < distToEnd) {
            this.trimStart = Math.min(clickTime, this.trimEnd - 0.1);
        } else {
            this.trimEnd = Math.max(clickTime, this.trimStart + 0.1);
        }

        this.updateTimeline();
        this.videoPlayer.currentTime = clickTime;
    }

    startDrag(e, handle) {
        e.preventDefault();
        const rect = this.timeline.getBoundingClientRect();
        const timelineWidth = rect.width - 20; // Account for padding
        const timelineLeft = rect.left + 10; // Account for padding

        const handleMouseMove = (moveEvent) => {
            // Calculate absolute position within timeline
            const mouseX = moveEvent.clientX - timelineLeft;
            const percent = Math.max(0, Math.min(1, mouseX / timelineWidth));
            const newTime = percent * this.videoDuration;

            if (handle === 'start') {
                this.trimStart = Math.max(0, Math.min(newTime, this.trimEnd - 0.1));
                this.videoPlayer.currentTime = this.trimStart;
            } else {
                this.trimEnd = Math.min(this.videoDuration, Math.max(newTime, this.trimStart + 0.1));
                this.videoPlayer.currentTime = this.trimEnd;
            }

            this.updateTimeline();
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    handleTimeUpdate() {
        // Keep video playback within trim bounds
        if (this.videoPlayer.currentTime < this.trimStart) {
            this.videoPlayer.currentTime = this.trimStart;
        } else if (this.videoPlayer.currentTime > this.trimEnd) {
            this.videoPlayer.currentTime = this.trimStart;
        }
    }

    // Format selection methods
    selectFormat(format) {
        this.selectedFormat = format;

        // Update UI
        this.mp4Format.classList.toggle('active', format === 'mp4');
        this.gifFormat.classList.toggle('active', format === 'gif');

        // Show/hide relevant controls
        this.mp4Controls.classList.toggle('hidden', format !== 'mp4');
        this.gifControls.classList.toggle('hidden', format !== 'gif');
    }

    selectResolution(scale) {
        this.selectedScale = scale;

        // Update UI
        document.querySelectorAll('.resolution-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.scale) === scale);
        });
    }

    // Processing methods
    async processVideo() {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.renderBtn.disabled = true;
        this.progressContainer.style.display = 'block';
        this.hideError();
        this.disableControls();

        try {
            if (this.webCodecsSupported) {
                await this.processWithWebCodecs();
            } else {
                await this.processWithFFmpeg();
            }
        } catch (error) {
            this.showError(`Processing failed: ${error.message}`);
            console.error('Processing error:', error);
        } finally {
            this.isProcessing = false;
            this.renderBtn.disabled = false;
            this.progressContainer.style.display = 'none';
            this.enableControls();
        }
    }

    async processWithWebCodecs() {
        this.updateProgress(0, 'WebCodecs detected, checking capabilities...');

        // WebCodecs is great for low-level encoding but lacks container muxing
        // For complete video processing with proper MP4/GIF output, use FFmpeg
        this.updateProgress(10, 'WebCodecs lacks container muxing. Switching to FFmpeg...');
        await this.delay(500); // Brief pause to show the message

        // Seamlessly hand off to FFmpeg
        await this.processWithFFmpeg();
    }

    async processWithFFmpeg() {
        this.updateProgress(0, 'Loading FFmpeg.wasm...');

        try {
            // Check SharedArrayBuffer availability (required for FFmpeg.wasm)
            if (typeof SharedArrayBuffer === 'undefined') {
                throw new Error('SharedArrayBuffer not available. Please serve this application with proper CORS headers (Cross-Origin-Opener-Policy: same-origin, Cross-Origin-Embedder-Policy: require-corp) or use HTTPS.');
            }

            // Load FFmpeg.wasm via script tag to avoid ES module issues
            if (!this.ffmpeg) {
                await this.loadFFmpegScript();

                // FFmpeg is properly structured as window.FFmpeg.{createFFmpeg, fetchFile}
                if (!window.FFmpeg || !window.FFmpeg.createFFmpeg || !window.FFmpeg.fetchFile) {
                    throw new Error('FFmpeg not properly loaded from CDN');
                }

                // Store references for easy access
                this.createFFmpeg = window.FFmpeg.createFFmpeg;
                this.fetchFile = window.FFmpeg.fetchFile;

                // Create FFmpeg instance with memory optimization
                this.ffmpeg = this.createFFmpeg({
                    log: true,
                    corePath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js',
                    wasmPath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.wasm',
                    workerPath: 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.worker.js'
                });

                // Load FFmpeg core
                await this.ffmpeg.load();
            }

            this.updateProgress(20, 'FFmpeg loaded, processing video...');

            // Debug: Show current trim values before processing
            console.log(`Processing started with trim values - Start: ${this.trimStart}s, End: ${this.trimEnd}s, Video Duration: ${this.videoDuration}s`);

            // Check video size and add warnings
            const fileSizeMB = this.currentFile.size / (1024 * 1024);
            const inputPixels = this.originalWidth * this.originalHeight;

            if (fileSizeMB > 100) {
                this.updateProgress(25, `Large file detected (${fileSizeMB.toFixed(1)}MB). This may take a while...`);
                await this.delay(1000);
            }

            if (inputPixels > 4000000) { // 4K+ resolution
                this.updateProgress(30, 'High resolution detected. Reducing quality for browser compatibility...');
                await this.delay(1000);
            }

            // Clean up FFmpeg virtual filesystem from previous runs
            try {
                const existingFiles = this.ffmpeg.FS('readdir', '/');
                console.log('Files before cleanup:', existingFiles);
                
                // Remove common files that might exist from previous runs
                ['input.mp4', 'output.mp4', 'output.gif', 'palette.png'].forEach(filename => {
                    try {
                        this.ffmpeg.FS('unlink', filename);
                        console.log(`✓ Removed ${filename}`);
                    } catch (e) {
                        // File doesn't exist, which is fine
                    }
                });
            } catch (cleanupError) {
                console.log('Cleanup note:', cleanupError.message);
            }

            // Write input file
            this.ffmpeg.FS('writeFile', 'input.mp4', await this.fetchFile(this.currentFile));

            // Calculate output dimensions with memory constraints
            let outputWidth = Math.round(this.originalWidth * this.selectedScale);
            let outputHeight = Math.round(this.originalHeight * this.selectedScale);

            // Warn about high resolutions but don't override user choice
            const maxPixels = 1920 * 1080; // 1080p reference
            if (outputWidth * outputHeight > maxPixels) {
                this.updateProgress(32, `High resolution ${outputWidth}x${outputHeight} - processing may be slow`);
                await this.delay(1500);
            }

            // Ensure even dimensions for H.264 encoding
            outputWidth = Math.floor(outputWidth / 2) * 2;
            outputHeight = Math.floor(outputHeight / 2) * 2;

            this.updateProgress(35, `Processing at ${outputWidth}x${outputHeight} (optimized for browser)`);
            await this.delay(1000);

            let command;
            let outputFilename;

            if (this.selectedFormat === 'mp4') {
                // MP4 CBR encoding for guaranteed size targeting
                outputFilename = 'output.mp4';
                const targetBitrate = this.calculateTargetBitrate(outputWidth, outputHeight);

                // Single-pass CBR encoding with strict rate control
                this.updateProgress(45, `Encoding MP4 with CBR (${targetBitrate}kbps)...`);
                try {
                    await this.ffmpeg.run(
                        '-i', 'input.mp4',
                        '-ss', this.trimStart.toString(),
                        '-t', (this.trimEnd - this.trimStart).toString(),
                        '-vf', `scale=${outputWidth}:${outputHeight}`,
                        '-c:v', 'libx264',
                        '-preset', 'medium', // Good balance of speed and compression
                        '-b:v', `${targetBitrate}k`,     // Target video bitrate
                        '-minrate', `${targetBitrate}k`, // Force minimum = target (CBR)
                        '-maxrate', `${targetBitrate}k`, // Force maximum = target (CBR)
                        '-bufsize', `${targetBitrate}k`, // Small buffer for strict control
                        '-c:a', 'aac',
                        '-b:a', '128k', // Constant audio bitrate
                        '-movflags', '+faststart', // Web optimization
                        outputFilename
                    );
                } catch (runError) {
                    console.error('FFmpeg MP4 CBR encoding error:', runError);
                    throw new Error(`MP4 CBR encoding failed: ${runError.message}`);
                }
            } else {
                // GIF generation with palette
                outputFilename = 'output.gif';

                // Use the actual selected trim duration
                let actualDuration = this.trimEnd - this.trimStart;

                // Only warn about large GIFs, don't limit them
                if (actualDuration > 30) {
                    this.updateProgress(50, `Creating ${actualDuration.toFixed(1)}s GIF - this may result in a large file`);
                    await this.delay(1500);
                }

                console.log(`GIF processing: Start ${this.trimStart}s, Duration ${actualDuration}s`);

                // Generate palette with reduced colors for memory efficiency
                this.updateProgress(55, 'Generating optimized color palette...');
                try {
                    await this.ffmpeg.run(
                        '-ss', this.trimStart.toString(),
                        '-t', actualDuration.toString(),
                        '-i', 'input.mp4',
                        '-vf', `scale=${outputWidth}:${outputHeight}:flags=lanczos,palettegen=max_colors=128`,
                        'palette.png'
                    );
                } catch (paletteError) {
                    console.error('FFmpeg palette generation error:', paletteError);
                    throw new Error(`Palette generation failed: ${paletteError.message}`);
                }

                // Verify palette was created
                try {
                    const filesAfterPalette = this.ffmpeg.FS('readdir', '/');
                    console.log('Files after palette generation:', filesAfterPalette);
                    if (!filesAfterPalette.includes('palette.png')) {
                        throw new Error('Palette generation completed but palette.png was not created');
                    }
                    console.log('✓ Palette.png successfully created');
                } catch (checkError) {
                    throw new Error(`Palette verification failed: ${checkError.message}`);
                }

                // Generate GIF with palette and optimizations
                this.updateProgress(75, 'Generating optimized GIF...');
                try {
                    await this.ffmpeg.run(
                        '-ss', this.trimStart.toString(),
                        '-t', actualDuration.toString(),
                        '-i', 'input.mp4',
                        '-i', 'palette.png',
                        '-filter_complex', `[0:v]scale=${outputWidth}:${outputHeight}:flags=lanczos,fps=${this.targetFramerate}[v];[v][1:v]paletteuse=dither=bayer:bayer_scale=3`,
                        outputFilename
                    );
                } catch (gifError) {
                    console.error('FFmpeg GIF generation error:', gifError);
                    throw new Error(`GIF generation failed: ${gifError.message}`);
                }
            }

            this.updateProgress(95, 'Finalizing...');

            // Check if output file exists before trying to read it
            try {
                const files = this.ffmpeg.FS('readdir', '/');
                console.log('Files in FFmpeg filesystem:', files);

                if (!files.includes(outputFilename)) {
                    throw new Error(`Output file '${outputFilename}' was not created. FFmpeg processing may have failed.`);
                }
            } catch (fsError) {
                console.error('Filesystem error:', fsError);
                throw new Error(`Failed to check output file: ${fsError.message}`);
            }

            // Read output file
            const outputData = this.ffmpeg.FS('readFile', outputFilename);
            
            // Validate file size for MP4 (size targeting)
            if (this.selectedFormat === 'mp4') {
                const actualSizeMB = outputData.length / (1024 * 1024);
                const targetSizeMB = this.targetSize;
                const sizeRatio = actualSizeMB / targetSizeMB;
                
                console.log(`File size validation - Target: ${targetSizeMB}MB, Actual: ${actualSizeMB.toFixed(2)}MB, Ratio: ${sizeRatio.toFixed(2)}`);
                
                if (sizeRatio > 1.1) { // More than 10% over target
                    console.warn(`⚠️  Output file (${actualSizeMB.toFixed(2)}MB) exceeds target (${targetSizeMB}MB) by ${((sizeRatio - 1) * 100).toFixed(1)}%`);
                } else if (sizeRatio < 0.5) { // Less than 50% of target
                    console.warn(`⚠️  Output file (${actualSizeMB.toFixed(2)}MB) is much smaller than target (${targetSizeMB}MB)`);
                } else {
                    console.log(`✓ File size within acceptable range: ${actualSizeMB.toFixed(2)}MB (target: ${targetSizeMB}MB)`);
                }
            }
            
            const blob = new Blob([outputData], {
                type: this.selectedFormat === 'mp4' ? 'video/mp4' : 'image/gif'
            });

            // Download file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trimmed_video.${this.selectedFormat}`;
            a.click();

            // Clean up to release file handles
            setTimeout(() => {
                URL.revokeObjectURL(url);
                // Note: Keep this.currentFile for multiple processing sessions
            }, 1000); // Small delay to ensure download started

            this.updateProgress(100, 'Processing complete!');

            // Clean up FFmpeg virtual filesystem after processing
            try {
                ['input.mp4', outputFilename, 'palette.png'].forEach(filename => {
                    try {
                        this.ffmpeg.FS('unlink', filename);
                        console.log(`✓ Cleaned up ${filename}`);
                    } catch (e) {
                        // File might not exist, which is fine
                    }
                });
                console.log('✓ FFmpeg filesystem cleaned up');
            } catch (cleanupError) {
                console.log('Post-processing cleanup note:', cleanupError.message);
            }

        } catch (error) {
            throw new Error(`FFmpeg processing failed: ${error.message}`);
        }
    }

    calculateTargetBitrate(width, height) {
        const duration = this.trimEnd - this.trimStart;
        const targetSizeBytes = this.targetSize * 1024 * 1024;
        const audioBitrate = 128; // kbps
        const containerOverhead = 0.97; // 3% overhead for MP4 container, metadata, etc.

        // Calculate total bitrate in kbps
        const totalBitrate = (targetSizeBytes * 8) / (duration * 1000);
        
        // Subtract audio bitrate and apply container overhead
        const videoBitrate = Math.max(
            100, // Minimum video bitrate for usable quality
            Math.round((totalBitrate - audioBitrate) * containerOverhead)
        );

        // Check for very low quality scenarios
        if (videoBitrate < 300) {
            console.warn(`⚠️  Low video bitrate (${videoBitrate}kbps) - consider reducing resolution or increasing target size`);
        }

        console.log(`CBR Calculation: Target: ${this.targetSize}MB, Duration: ${duration}s, Total: ${totalBitrate.toFixed(1)}kbps, Audio: ${audioBitrate}kbps, Video: ${videoBitrate}kbps`);

        return Math.min(videoBitrate, 10000); // Cap at 10 Mbps
    }

    calculateWebCodecsBitrate(width, height) {
        if (this.selectedFormat === 'gif') {
            // For VP8/WebM output (GIF alternative), use simpler calculation
            return Math.max(500000, width * height * this.targetFramerate * 0.1);
        } else {
            // For MP4, use file size targeting
            const duration = this.trimEnd - this.trimStart;
            const targetSizeBytes = this.targetSize * 1024 * 1024;
            const overhead = 0.85; // Leave 15% overhead for WebCodecs

            const targetBitrate = Math.max(
                200000, // Minimum 200kbps
                Math.round((targetSizeBytes * 8 / duration)) * overhead
            );

            return Math.min(targetBitrate, 50000000); // Cap at 50 Mbps for very large targets
        }
    }

    updateProgress(percent, text) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = text;
    }

    // Utility methods
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showError(message) {
        this.errorMessage.textContent = message;
        this.errorMessage.style.display = 'block';
    }

    hideError() {
        this.errorMessage.style.display = 'none';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    disableControls() {
        // Disable format buttons
        this.mp4Format.disabled = true;
        this.gifFormat.disabled = true;

        // Disable resolution buttons
        document.querySelectorAll('.resolution-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Disable size/framerate inputs and presets
        this.sizeInput.disabled = true;
        this.framerateInput.disabled = true;
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Disable timeline interactions and add visual styling
        this.timeline.style.pointerEvents = 'none';
        this.timeline.classList.add('processing');
        this.startHandle.style.pointerEvents = 'none';
        this.endHandle.style.pointerEvents = 'none';

        // Disable file drop zone and add visual styling
        this.dropZone.style.pointerEvents = 'none';
        this.dropZone.classList.add('processing');
        this.fileInput.disabled = true;
    }

    enableControls() {
        // Enable format buttons
        this.mp4Format.disabled = false;
        this.gifFormat.disabled = false;

        // Enable resolution buttons
        document.querySelectorAll('.resolution-btn').forEach(btn => {
            btn.disabled = false;
        });

        // Enable size/framerate inputs and presets
        this.sizeInput.disabled = false;
        this.framerateInput.disabled = false;
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.disabled = false;
        });

        // Enable timeline interactions and remove visual styling
        this.timeline.style.pointerEvents = 'auto';
        this.timeline.classList.remove('processing');
        this.startHandle.style.pointerEvents = 'auto';
        this.endHandle.style.pointerEvents = 'auto';

        // Enable file drop zone and remove visual styling
        this.dropZone.style.pointerEvents = 'auto';
        this.dropZone.classList.remove('processing');
        this.fileInput.disabled = false;
    }

    loadFFmpegScript() {
        return new Promise((resolve, reject) => {
            if (typeof FFmpeg !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js';

            script.onload = () => {
                console.log('FFmpeg script loaded, checking global variables...');
                console.log('FFmpeg available:', typeof FFmpeg);
                console.log('fetchFile available:', typeof fetchFile);
                console.log('Global FFmpeg object:', window.FFmpeg);
                resolve();
            };

            script.onerror = (e) => {
                console.error('Script loading error:', e);
                reject(new Error('Failed to load FFmpeg script'));
            };

            document.head.appendChild(script);
        });
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new TrimNSizer();
});