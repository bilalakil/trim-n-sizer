# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trim-n-Sizer is a lightweight web application for quickly editing videos for sharing. It operates entirely client-side without server uploads, allowing users to trim videos and compress them to specific file size targets.

## Key Requirements

### Core Functionality
- Drag and drop video file upload
- In-browser video playback with timeline controls
- Draggable start/end trim handles with real-time scrubbing
- File size input field with preset buttons (5mb, 10mb, 25mb, 50mb)
- Render button that applies trimming and compression to meet size targets
- Automatic download of processed video

### Technical Constraints
- **Client-side only**: All processing must occur locally in the browser
- **No internet dependency**: Must work offline after initial load
- **Low-tech approach**: Avoid heavy frameworks where possible
- **Mobile-friendly**: Responsive design required

### Security Requirements
- **CRITICAL**: Only work within the project folder
- Never read, write, or access files outside the project directory

## Architecture Notes

### Frontend Structure
- Single page application
- Minimal HTML/CSS/JavaScript implementation
- Dark mode UI with modern, consistent design
- Drag-and-drop interface that transforms into video player

### Video Processing
- Use Web APIs for video manipulation (likely Canvas API, Web Workers)
- Implement compression algorithms for file size targeting
- Handle multiple compression strategies: quality reduction, FPS reduction, resolution scaling

## Common Development Commands

Since this is a client-side web application:
- `python -m http.server 8000` or similar for local development server
- No build process required unless bundling is added later
- Direct file serving for development and testing

## Development Guidelines

- Test on multiple video formats and sizes
- Ensure mobile compatibility across devices
- Validate file size targeting accuracy
- Implement proper error handling for unsupported formats
- Consider performance with large video files