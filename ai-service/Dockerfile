FROM python:3.9-slim

WORKDIR /app

# Install system dependencies (if needed for OCR/PDF tools later)
# RUN apt-get update && apt-get install -y build-essential libpoppler-cpp-dev pkg-config

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy French model
RUN python -m spacy download fr_core_news_lg

# Copy application code
COPY . .

# Expose port (Cloud Run expects 8080 by default)
ENV PORT=8080

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
