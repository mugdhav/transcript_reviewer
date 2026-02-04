# User Guide for MV Subtitle Generator & Reviewer

Welcome to the **MV Subtitle Generator**, an intelligent tool designed to not only transcribe your audio and video files but also help you review and correct them with the power of Context-Aware AI.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Uploading Your Media](#uploading-your-media)
3. [Reviewing Subtitles](#reviewing-subtitles)
4. [Using the Media Player](#using-the-media-player)
5. [Fixing Issues & Anomalies](#fixing-issues--anomalies)
6. [Manual Editing](#manual-editing)
7. [Exporting](#exporting)

---

## Getting Started

When you first open the application, you will be greeted by the landing page. Here you can start a new project or learn more about the features.

![Landing Page Demo](./assets/landing_demo.webp)

Click **"Get Started"** to begin.

---

## Uploading Your Media

The upload screen allows you to drag and drop your file or select it from your computer.

### Supported Formats
- **Audio**: MP3
- **Video**: MP4
- **Size Limit**: Up to 25 MB

### The Power of Context
One of the most powerful features of this application is the **"Context"** field.

![Upload Page](./assets/upload_page.png)

**Why use it?**
The AI uses this context to understand your audio better. If you are uploading a technical lecture about "Data Science", the AI will know that "date a" probably means "**data**".

**What to write:**
- Subject matter (e.g., "Podcast about machine learning")
- Speaker names (e.g., "Interview with Dr. Sarah Smith")
- Technical terms or acronyms (e.g., "Discussing SQL and NoSQL databases")

---

## Reviewing Subtitles

Once processing is complete, you will be taken to the **Review Interface**. This is your command center for polishing your subtitles.

![Full Review Interface Demo](./assets/review_demo.webp)

The interface is divided into three main areas:
1.  **Anomaly Review (Left)**: Highlights specific issues detected by the AI.
2.  **Media Player (Left/Center)**: Plays your audio/video in sync with the text.
3.  **SRT Preview (Right)**: The full list of subtitle segments.

---

## Using the Media Player

The built-in media player allows you to watch or listen to your file while you review.

![Media Playing](./assets/media_player.png)

- **Deep Sync**: Clicking any subtitle segment in the list will **jump the audio** to exactly that point.
- **Auto-Scroll**: As the audio plays, the active subtitle segment is highlighted in the preview list.
- **Auto-Pause**: If you start editing a subtitle, the player will automatically pause so you can focus.

---

## Fixing Issues & Anomalies

The AI scans your text for potential errors like grammar mistakes, homophones (e.g., "to" vs "too"), or out-of-context phrases.

![Anomaly Correction](./assets/anomaly_review.png)

**The Process:**
1.  The panel shows the flagged text and explains **why** it might be wrong (e.g., "Unusual sentence structure").
2.  It offers a **Suggested Correction**.
3.  You can:
    *   **Skip**: Keep the text as is.
    *   **Use**: Click "Use" to copy the suggestion to the correction box.
    *   **Edit**: Type your own correction manually.
    *   **Apply**: Save the change.

**Batch Corrections**: If the same error appears multiple times (e.g., a misspelled name), the system will ask if you want to fix **all occurrences** at once!

---

## Manual Editing

You don't have to wait for the AI to flag something. You can edit **any** segment at any time.

![Inline Editing](./assets/inline_editing.png)

1.  Hover over a segment in the list.
2.  Click the **Pencil icon** (Edit).
3.  The text becomes an editable box.
4.  Make your changes and click **Save**.

*Note: The audio will pause automatically while you edit.*

---

## Exporting

Once you are happy with your subtitles:
1.  Review the statistics in the sidebar to ensure all strict issues are resolved (optional).
2.  Click the **Export SRT** button.
3.  Your clean, synced `.srt` file will download immediately.
