import { FFmpeg } from "/assets/ffmpeg/package/dist/esm/index.js";
import { toBlobURL } from "/assets/util/package/dist/esm/index.js";

class TrimNSizer {
    constructor() {
        this.ffmpeg = null;
        this.currentFile = null;
        this.videoDuration = 0;
        this.trimStart = 0;
        this.trimEnd = 0;

        this.initializeElements();
        this.setupEventListeners();
        this.initializeFFmpeg();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.videoContainer = document.getElementById('videoContainer');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.timelineContainer = document.getElementById('timelineContainer');
        this.timeline = document.getElementById('timeline');
        this.timelineSelection = document.getElementById('timelineSelection');
        this.startHandle = document.getElementById('startHandle');
        this.endHandle = document.getElementById('endHandle');
        this.startTime = document.getElementById('startTime');
        this.endTime = document.getElementById('endTime');
        this.sizeInput = document.getElementById('sizeInput');
        this.renderBtn = document.getElementById('renderBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
    }

    setupEventListeners() {
        // Drag and drop
        this.dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropZone.addEventListener('drop', this.handleDrop.bind(this));
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Size presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.sizeInput.value = e.target.dataset.size;
            });
        });

        // Video events
        this.videoPlayer.addEventListener('loadedmetadata', this.handleVideoLoaded.bind(this));
        this.videoPlayer.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));

        // Timeline handles
        this.startHandle.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'end'));

        // Render button
        this.renderBtn.addEventListener('click', this.handleRender.bind(this));

        // Paste functionality
        document.addEventListener('paste', this.handlePaste.bind(this));
    }

    async initializeFFmpeg() {
        try {
            this.ffmpeg = new FFmpeg();

            // Load FFmpeg using toBlobURL like vanilla example
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
            await this.ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });

            console.log('FFmpeg loaded successfully');

            // Add progress and log listeners for feedback
            this.ffmpeg.on('log', ({ message }) => {
                console.debug('FFmpeg:', message);
                this.updateProgress(null, `FFmpeg: ${message.substring(0, 60)}...`);
            });
        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
        }
    }

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

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            this.loadVideoFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            this.loadVideoFile(file);
        }
    }

    handlePaste(e) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('video/')) {
                const file = item.getAsFile();
                if (file) {
                    this.loadVideoFile(file);
                    e.preventDefault(); // Prevent default paste behavior
                    break; // Use the first video file found
                }
            }
        }
    }

    loadVideoFile(file) {
        this.currentFile = file;

        // Create object URL for video player
        const videoURL = URL.createObjectURL(file);
        this.videoPlayer.src = videoURL;

        // Show video container and hide drop zone content
        this.dropZone.classList.add('has-video');
        this.videoContainer.style.display = 'block';
        this.dropZone.querySelector('.drop-icon').style.display = 'none';
        this.dropZone.querySelector('.drop-text').style.display = 'none';
        this.dropZone.querySelector('.drop-subtext').style.display = 'none';

        // Move video container inside drop zone
        this.dropZone.appendChild(this.videoContainer);
    }

    handleVideoLoaded() {
        this.videoDuration = this.videoPlayer.duration;
        this.trimStart = 0;
        this.trimEnd = this.videoDuration;

        // Show timeline and enable render button
        this.timelineContainer.style.display = 'block';
        this.renderBtn.disabled = false;

        // Initialize timeline
        this.updateTimeline();
        this.updateTimeDisplay();
    }

    handleTimeUpdate() {
        // Update timeline position if not being dragged
        if (!this.isDragging) {
            this.updateTimelinePosition();
        }
    }

    handleMouseDown(e, handle) {
        e.preventDefault();
        this.isDragging = true;
        this.dragHandle = handle;
        this.videoPlayer.pause();

        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;

        const timelineRect = this.timeline.getBoundingClientRect();
        const timelineWidth = timelineRect.width - 20; // Account for padding
        const mouseX = e.clientX - timelineRect.left - 10; // Account for padding
        const percent = Math.max(0, Math.min(1, mouseX / timelineWidth));
        const time = percent * this.videoDuration;

        if (this.dragHandle === 'start') {
            this.trimStart = Math.min(time, this.trimEnd - 0.1);
            this.videoPlayer.currentTime = this.trimStart;
        } else {
            this.trimEnd = Math.max(time, this.trimStart + 0.1);
            this.videoPlayer.currentTime = this.trimEnd;
        }

        this.updateTimeline();
        this.updateTimeDisplay();
    }

    handleMouseUp() {
        this.isDragging = false;
        this.dragHandle = null;
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    updateTimeline() {
        const timelineWidth = this.timeline.clientWidth - 20; // Account for padding

        const startPercent = (this.trimStart / this.videoDuration) * 100;
        const endPercent = (this.trimEnd / this.videoDuration) * 100;
        const selectionWidth = endPercent - startPercent;

        this.startHandle.style.left = `${10 + (startPercent / 100) * timelineWidth}px`;
        this.endHandle.style.left = `${10 + (endPercent / 100) * timelineWidth}px`;

        this.timelineSelection.style.left = `${10 + (startPercent / 100) * timelineWidth}px`;
        this.timelineSelection.style.width = `${(selectionWidth / 100) * timelineWidth}px`;
    }

    updateTimelinePosition() {
        if (!this.videoDuration) return;

        const currentPercent = (this.videoPlayer.currentTime / this.videoDuration) * 100;
        // Could add a playhead indicator here if desired
    }

    updateTimeDisplay() {
        this.startTime.textContent = this.formatTime(this.trimStart);
        this.endTime.textContent = this.formatTime(this.trimEnd);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async handleRender() {
        if (!this.currentFile || !this.ffmpeg) {
            alert('Please select a video file first');
            return;
        }

        try {
            this.showProgress('Preparing video...');
            this.renderBtn.disabled = true;

            // Read the input file
            const arrayBuffer = await this.currentFile.arrayBuffer();
            const inputFileName = 'input.' + this.getFileExtension(this.currentFile.name);
            await this.ffmpeg.writeFile(inputFileName, new Uint8Array(arrayBuffer));

            const targetSizeMB = parseFloat(this.sizeInput.value);
            const duration = this.trimEnd - this.trimStart;

            // Start with high compression and work down
            const outputFile = await this.compressToTargetSize(
                inputFileName,
                targetSizeMB,
                duration
            );

            // Download the result
            const data = await this.ffmpeg.readFile(outputFile);
            this.downloadFile(data, `trimmed_${this.currentFile.name}`);

            this.hideProgress();
            alert('Video processed successfully!');

        } catch (error) {
            console.error('Render error:', error);
            alert('Error processing video: ' + error.message);
            this.hideProgress();
        } finally {
            this.renderBtn.disabled = false;
        }
    }

    async compressToTargetSize(inputFile, targetSizeMB, duration) {
        const targetSizeBytes = targetSizeMB * 1024 * 1024;

        // Start with aggressive compression (high CRF)
        let minCRF = 18; // Best quality
        let maxCRF = 35; // High compression
        let bestCRF = maxCRF;
        let bestSize = 0;
        let attempts = 0;
        const maxAttempts = 4; // Reduced for faster processing

        this.updateProgress(10, 'Finding optimal compression...');

        while (minCRF <= maxCRF && attempts < maxAttempts) {
            const currentCRF = Math.floor((minCRF + maxCRF) / 2);
            const outputFile = `output_${currentCRF}.mp4`;

            try {
                console.log(`CRF ${currentCRF}: Starting...`);

                // Trim and compress with performance optimizations
                await this.ffmpeg.exec([
                    '-i', inputFile,
                    '-ss', this.trimStart.toString(),
                    '-t', duration.toString(),
                    '-c:v', 'libx264',
                    '-crf', currentCRF.toString(),
                    '-preset', 'ultrafast',
                    '-threads', '0',
                    '-tune', 'zerolatency',
                    '-movflags', '+faststart',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    outputFile
                ]);

                // Check file size
                const data = await this.ffmpeg.readFile(outputFile);
                const fileSizeBytes = data.length;
                const fileSizeMB = fileSizeBytes / (1024 * 1024);

                console.log(`CRF ${currentCRF}: ${fileSizeMB.toFixed(2)}MB (target: ${targetSizeMB}MB)`);

                if (fileSizeBytes <= targetSizeBytes) {
                    // File is small enough, try better quality (lower CRF)
                    bestCRF = currentCRF;
                    bestSize = fileSizeBytes;
                    maxCRF = currentCRF - 1;
                } else {
                    // File is too big, increase compression (higher CRF)
                    minCRF = currentCRF + 1;
                }

                // Clean up intermediate file if not the best one
                if (currentCRF !== bestCRF) {
                    try {
                        await this.ffmpeg.deleteFile(outputFile);
                    } catch (e) {
                        // File might not exist, ignore
                    }
                }

            } catch (error) {
                console.error(`Error with CRF ${currentCRF}:`, error);
                minCRF = currentCRF + 1;
            }

            attempts++;
            this.updateProgress(10 + (attempts / maxAttempts) * 80,
                `Optimizing compression... (${attempts}/${maxAttempts})`);
        }

        // If we still don't have a good result, try reducing resolution
        const finalOutputFile = 'final_output.mp4';
        if (bestSize > targetSizeBytes && bestCRF > 0) {
            this.updateProgress(90, 'Reducing resolution for target size...');

            try {
                await this.ffmpeg.exec([
                    '-i', inputFile,
                    '-ss', this.trimStart.toString(),
                    '-t', duration.toString(),
                    '-c:v', 'libx264',
                    '-crf', bestCRF.toString(),
                    '-vf', 'scale=iw*0.8:ih*0.8', // Reduce resolution by 20%
                    '-preset', 'ultrafast',
                    '-threads', '0',
                    '-tune', 'zerolatency',
                    '-movflags', '+faststart',
                    '-c:a', 'aac',
                    '-b:a', '96k', // Lower audio bitrate too
                    finalOutputFile
                ]);

                // Clean up the previous best file
                if (bestCRF > 0) {
                    try {
                        await this.ffmpeg.deleteFile(`output_${bestCRF}.mp4`);
                    } catch (e) {
                        // Ignore
                    }
                }

                return finalOutputFile;
            } catch (error) {
                console.error('Resolution reduction failed:', error);
                // Fall back to best CRF result
                return `output_${bestCRF}.mp4`;
            }
        }

        return `output_${bestCRF}.mp4`;
    }

    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    showProgress(message) {
        this.progressContainer.style.display = 'block';
        this.progressText.textContent = message;
        this.progressFill.style.width = '0%';
    }

    updateProgress(percent, message) {
        if (percent !== null) {
            this.progressFill.style.width = percent + '%';
        }
        this.progressText.textContent = message;
    }

    hideProgress() {
        this.progressContainer.style.display = 'none';
    }

    downloadFile(data, filename) {
        const blob = new Blob([data], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TrimNSizer();
});