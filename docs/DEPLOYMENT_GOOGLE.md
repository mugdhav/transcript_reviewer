# Deployment Guide: Google Cloud Run

This guide explains how to deploy the Gemini Subtitle Generator to Google Cloud Run for hosting and showcasing.

## Prerequisites

1.  **Google Cloud Project**: Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Google Cloud SDK**: Install the `gcloud` CLI on your local machine.
3.  **Docker**: Ensure Docker is installed and running.
4.  **Gemini API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/apikey).

## Steps

### 1. Build the Docker Image

Build the container image using the provided `Dockerfile`. Replace `PROJECT_ID` with your Google Cloud Project ID.

```bash
docker build -t gcr.io/[PROJECT_ID]/transcript-reviewer .
```

### 2. Push to Container Registry

Authenticate and push the image to Google Container Registry.

```bash
gcloud auth configure-docker
docker push gcr.io/[PROJECT_ID]/transcript-reviewer
```

### 3. Deploy to Cloud Run

Deploy the container and set the strictly required environment variables.

```bash
gcloud run deploy transcript-reviewer \
  --image gcr.io/[PROJECT_ID]/transcript-reviewer \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=your_api_key_here
```

> [!IMPORTANT]
> **Port Note**: The application is configured to expose port **8080**, which is the default for Cloud Run. Your Dockerfile `EXPOSE` and `PORT` environment variables should reflect this.

### 4. Verify Deployment

Once the deployment completes, `gcloud` will provide a URL (e.g., `https://transcript-reviewer-xyz.a.run.app`). Visit this URL to test your live application.

## Troubleshooting

-   **Check Logs**: Use `gcloud logs read --service transcript-reviewer` to debug startup issues.
-   **API Key Errors**: Ensure the `GOOGLE_API_KEY` is correctly set in the environment variables section of the Cloud Run console.
-   **Memory Limits**: Large video files might require increasing the memory limit of your Cloud Run instance (default is 512MB, 2GB recommended).

## Google AI Studio Showcase

To showcase your application and share it with the Gemini community:

1.  **Deploy to Cloud Run**: Follow the steps above to get a public `https://...` URL.
2.  **Ensure "Learn More" is Updated**: The "Learn More" button in this app currently links to the GitHub repository. Ensure your latest changes are pushed to GitHub.
3.  **Share the Project**:
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Use the "Share" button on your prompts/tuned models to link to your live demo if you are building a specific collection.
    *   For the full application showcase, share your Cloud Run URL on forums, social media, or with the Google Gemini community.
4.  **Security Note**: Never include your `GOOGLE_API_KEY` in your code or frontend. The Cloud Run deployment strategy (Step 3) ensures your key stays on the server-side, protected from end-users.
