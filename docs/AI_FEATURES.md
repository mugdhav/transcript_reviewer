# AI & Context Features

The **MV Subtitle Generator** isn't just a transcriber; it's a context-aware editor. This document explains how the AI works to give you better results.

## The Problem with Traditional Transcription
Standard Speech-to-Text engines often struggle with:
- **Homophones**: Words that sound the same but mean different things (for example, *pair* vs *pear*, *date a* vs *data*).
- **Specialized Jargon**: Technical terms often get transcribed as common words (for example, *JSON* vs *Jason*, *SQL* vs *sequel*, etc.). 
- **Names**: Unique names are often misspelled (for example, *John* vs *Jon*, *Rahel* vs *Rachel*, etc.).

## Our Solution: Context Injection

We use a sophisticated **LLM (Large Language Model)** review stage. When you provide context during upload, we pass this directly to the AI's "brain" when it reviews your text.

### How it works
1.  **Transcription**: The audio is converted to raw text.
2.  **Semantic Analysis**: The AI reads the text *and* your provided context.
3.  **Cross-Referencing**: It asks: *"Does this word make sense given the user said this is a medical lecture?"*

### Examples

| Context Provided | Audio Heard | Bad Transcription | MV AI Correction |
| :--- | :--- | :--- | :--- |
| "Programming tutorial" | "We need to verify the code" | "We need to very fry the code" | **"verify"** |
| "Financial report" | "The company's machine earning" | "machine earning" | **"machine learning"** |
| "Biology class" | "Look under the mike row scope" | "mike row scope" | **"microscope"** |

## Auto-Tidy (Confidence Scoring)

The AI assigns a **Confidence Score** (0-100%) to every potential error it finds.

-   **High Confidence (100%) -> Auto-Fix**: If the AI is virtually certain it's a mistake (e.g., specific known typo or grammar rule failure), it will **automatically fix it** before you even see the review screen. These appear as "Auto-applied" in your review list.
-   **Medium Confidence -> Suggestion**: If it's unsure, it flags it as an "Anomaly" and asks for your human review, providing a reason and a suggestion.

## Getting the Best Results
To maximize accuracy:
1.  **Be Specific**: Instead of just "Meeting", try "Quarterly marketing meeting discussing Q4 budget and ROI".
2.  **List Terms**: "Keywords: React, TypeScript, API, Database".
3.  **Name Names**: "Speakers: John, Sarah, and Dr. Emily".
