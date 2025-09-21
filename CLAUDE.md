# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trim-n-Sizer is a lightweight web-based video trimming and compression tool that operates entirely client-side. Users can drag and drop videos, trim them using timeline controls, and compress them to specific target file sizes without any server uploads.

## Architecture Requirements

### Core Implementation Strategy
- **Client-side only**: All processing must occur locally in the browser
- **Offline capable**: Must work without internet connection after initial load
- **Minimal dependencies**: Avoid heavy frameworks where possible
- **Progressive enhancement**: WebCodecs GPU processing with FFmpeg CPU fallback

### Technology Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no heavy frameworks)
- **Video Processing**:
  - Primary: WebCodecs API for GPU-accelerated processing
  - Fallback: FFmpeg.wasm for CPU-based processing
- **Dependencies**: Source required libraries from unpkg

## Key Features to Implement

### User Interface
- Drag-and-drop video upload with file browser fallback
- In-browser video player with timeline scrubber
- Draggable start/end trim handles
- Dark mode design with modern, comfortable visuals
- Responsive layout similar to video player interfaces

### Video Processing Options
- **Output formats**: MP4 and GIF
- **Resolution scaling**: 100%, 75%, 50% with original resolution display
- **MP4 compression**: Target file sizes (25MB, 10MB, 5MB, custom input)
- **GIF options**: Target framerates (15, 10, 5, 3 fps, custom input)
- **Processing feedback**: Live status updates and progress indication

### Technical Implementation Details
- **MP4 encoding**: Two-pass ABR with padding to ensure target size compliance
- **GIF generation**: Two-step process (palette generation, then encoding)
- **Memory management**: Handle large video files efficiently
- **Error handling**: Graceful fallbacks for unsupported formats

## Security Requirements

**CRITICAL CONSTRAINT**: Only work within the project directory. Never read, write, or access files outside the project folder.

## Development Commands

Since this is a client-side web application with no build process:

```bash
# Start local development server
python -m http.server 8000
```

Navigate to `http://localhost:8000` to test the application.

## File Structure

```
├── index.html          # Main application file with embedded CSS
├── app.js              # Core application logic and video processing
└── README.md           # Project documentation
```

## Implementation Notes

### WebCodecs Integration
- Use WebCodecs API for modern browser support with hardware acceleration
- Implement careful error handling and feature detection
- Provide comprehensive fallback to FFmpeg.wasm for compatibility

### Video Processing Strategy
- Implement accurate file size targeting with safety margins
- Use efficient compression algorithms while maintaining visual quality
- Handle various input formats (MP4, AVI, MOV, WebM, etc.)

### Timeline Implementation
- Create responsive timeline with precise scrubbing capabilities
- Implement smooth dragging interactions for trim handles
- Display accurate time codes and duration information

### Dependency Management
- Import FFmpeg.wasm and utilities directly from unpkg
- Use ES6 modules for clean imports
- Ensure offline functionality after initial library loading