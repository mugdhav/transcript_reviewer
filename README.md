---
title: Gemini Subtitle Generator & Reviewer
emoji: 📝
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
app_port: 8080
---

# Gemini Subtitle Generator & Reviewer

A powerful, context-aware subtitle generation and cleaning tool. It combines industry-standard transcription with the intelligent Google Gemini 3 LLM-based review system to capture names, technical jargon, and grammar that standard tools miss.

## 🚀 Features

-   **Gemini 3 Powered**: High-speed, multimodal transcription and intelligent correction.
-   **Context-Aware AI**: Provides subject matter and speaker names to the AI for highly accurate transcription correction.
-   **Smart Auto-Tidy**: Automatically fixes high-confidence errors (typos, specific homophones) instantly.
-   **Interactive Review**:
    -   **Synced Media Player**: Watch your video (or listen to audio) in real-time while editing.
    -   **Click-to-Seek**: Click any subtitle segment to jump the audio to that exact moment.
    -   **Inline Editing**: Fix any text manually with a simple click.
-   **Format Support**: Works with MP3 (Audio) and MP4 (Video).

![Review Interface Demo](./docs/assets/review_demo.webp)

## 📚 Documentation

We have detailed guides to help you get the most out of the application:

*   **[User Guide](./docs/USER_GUIDE.md)**: A complete walkthrough of the interface, from upload to export.
*   **[AI & Context Features](./docs/AI_FEATURES.md)**: Learn how to use the "Context" field to get perfect results.
*   **[Deployment Guide](./docs/DEPLOYMENT_GOOGLE.md)**: How to host this application on Google Cloud Run.

## 🛠️ Quick Start

1.  **Run the Server**: `npm run dev`
2.  **Open Browser**: Go to `http://localhost:5000`
3.  **Upload**: Drag & drop your MP3/MP4 file and provide a short context description.
4.  **Review**: Use the interface to accept AI suggestions or make manual edits.
5.  **Export**: Download your finished `.srt` file.

## Tech Stack
-   **Frontend**: React, TanStack Query, ShadCN UI, Tailwind CSS.
-   **Backend**: Node.js (Express).
-   **AI/ML**: Google Gemini 3 API (gemini-3-flash).

