---
description: Apply CORS configuration to Firebase Storage
---

# Apply CORS Configuration

This workflow applies the `cors.json` configuration to your Firebase Storage bucket to fix upload errors.

## Prerequisites
- Google Cloud SDK (`gcloud` and `gsutil`) installed and authenticated.
- Access to the `mining-analysis-app` project.

## Steps

1.  **Open Terminal**: Open a terminal in the project root.

2.  **Run gsutil command**:
    Execute the following command to set the CORS configuration:
    ```powershell
    gsutil cors set cors.json gs://mining-analysis-app.appspot.com
    ```

3.  **Verify**:
    You can verify the configuration with:
    ```powershell
    gsutil cors get gs://mining-analysis-app.appspot.com
    ```

> [!NOTE]
> If you don't have `gsutil` installed, you can also configure CORS via the Google Cloud Console:
> 1. Go to the [Google Cloud Console](https://console.cloud.google.com/storage/browser/mining-analysis-app.appspot.com).
> 2. Open the Cloud Shell (icon in top right).
> 3. Upload `cors.json` to the Cloud Shell.
> 4. Run `gsutil cors set cors.json gs://mining-analysis-app.appspot.com`.
