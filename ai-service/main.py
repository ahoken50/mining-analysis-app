import os
import tempfile
import shutil
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore, storage
import spacy
from PyPDF2 import PdfReader

# Initialize FastAPI
app = FastAPI(title="Mining Analysis AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase
# In Cloud Run, we use Application Default Credentials (no explicit key needed usually)
# For local dev, we might need to point to a key if not authenticated via gcloud
if not firebase_admin._apps:
    if os.getenv("FIREBASE_SERVICE_ACCOUNT"):
        cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT"))
        firebase_admin.initialize_app(cred, {
            'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET")
        })
    else:
        firebase_admin.initialize_app(options={
            'storageBucket': os.getenv("FIREBASE_STORAGE_BUCKET")
        })

db = firestore.client()

# Load NLP model
try:
    nlp = spacy.load("fr_core_news_lg")
    
    # Add custom entity ruler for Quebec Mining Lexicon
    ruler = nlp.add_pipe("entity_ruler", before="ner")
    patterns = [
        {"label": "PERMIT", "pattern": [{"LOWER": "certificat"}, {"LOWER": "d'autorisation"}]},
        {"label": "PERMIT", "pattern": [{"LOWER": "permis"}, {"LOWER": "d'intervention"}]},
        {"label": "ORG", "pattern": [{"TEXT": "MRNF"}]},
        {"label": "ORG", "pattern": [{"TEXT": "MELCCFP"}]},
        {"label": "ORG", "pattern": [{"TEXT": "BAPE"}]},
        {"label": "IMPACT", "pattern": [{"LOWER": "faune"}]},
        {"label": "IMPACT", "pattern": [{"LOWER": "flore"}]},
        {"label": "IMPACT", "pattern": [{"LOWER": "milieu"}, {"LOWER": "humide"}]},
        {"label": "IMPACT", "pattern": [{"LOWER": "cours"}, {"LOWER": "d'eau"}]},
    ]
    ruler.add_patterns(patterns)
    
except OSError:
    print("Downloading model...")
    from spacy.cli import download
    download("fr_core_news_lg")
    nlp = spacy.load("fr_core_news_lg")

class AnalysisRequest(BaseModel):
    projectId: str
    documentPath: str

@app.get("/")
async def root():
    return {"status": "online", "service": "Mining Analysis AI"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

async def process_document(project_id: str, document_path: str):
    """
    Background task to process the document.
    """
    print(f"Processing document {document_path} for project {project_id}")
    
    tmp_file_path = None
    try:
        # 1. Download file from Firebase Storage
        bucket = storage.bucket()
        blob = bucket.blob(document_path)
        
        _, tmp_file_path = tempfile.mkstemp(suffix=".pdf")
        os.close(_) # Close the file descriptor
        
        blob.download_to_filename(tmp_file_path)
        print(f"Downloaded to {tmp_file_path}")

        # 2. Extract text (PyPDF2)
        text_content = ""
        with open(tmp_file_path, 'rb') as f:
            reader = PdfReader(f)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content += text + "\n"
        
        print(f"Extracted {len(text_content)} characters")

        # 3. Analyze text (spaCy)
        # Limit text length for memory safety if needed, but try full text first
        doc = nlp(text_content[:100000]) 
        
        entities = []
        locations = []
        dates = []
        permits = []
        impacts = []
        
        for ent in doc.ents:
            if ent.label_ == "LOC":
                if ent.text not in locations: locations.append(ent.text)
            elif ent.label_ == "ORG":
                if ent.text not in entities: entities.append(ent.text)
            elif ent.label_ == "DATE":
                if ent.text not in dates: dates.append(ent.text)
            elif ent.label_ == "PERMIT":
                if ent.text not in permits: permits.append(ent.text)
            elif ent.label_ == "IMPACT":
                if ent.text not in impacts: impacts.append(ent.text)

        # 3.5 Geocoding (Real Google Maps API)
        import requests
        location_coords = []
        api_key = os.getenv("GOOGLE_MAPS_API_KEY")
        
        if api_key:
            print(f"Geocoding {len(locations)} locations with Google Maps API...")
            for loc in locations[:5]: # Limit to 5 to save quota/time during batch
                try:
                    geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={loc}&key={api_key}"
                    response = requests.get(geocode_url)
                    data = response.json()
                    
                    if data['status'] == 'OK':
                        result = data['results'][0]
                        location_coords.append({
                            'name': loc,
                            'lat': result['geometry']['location']['lat'],
                            'lng': result['geometry']['location']['lng'],
                            'formatted_address': result['formatted_address']
                        })
                    else:
                        print(f"Geocoding failed for {loc}: {data['status']}")
                except Exception as geo_err:
                    print(f"Error geocoding {loc}: {geo_err}")
        else:
            print("Skipping Geocoding: GOOGLE_MAPS_API_KEY not found in env.")

        # 4. Update Firestore with results
        doc_ref = db.collection("projects").document(project_id)
        doc_ref.update({
            "analysis.status": "COMPLETED",
            "analysis.summary": text_content[:500] + "..." if len(text_content) > 500 else text_content,
            "analysis.entities": entities[:20],
            "analysis.locations": locations[:20],
            "analysis.location_coords": location_coords, # Store real coords
            "analysis.dates": dates[:10],
            "analysis.permits": permits,
            "analysis.impacts": impacts,
            "analysis.fullTextLength": len(text_content),
            "metadata.status": "ANALYZED"
        })
        
        # Add history event
        db.collection("history").add({
            "projectId": project_id,
            "action": "ANALYSIS_COMPLETED",
            "userId": "system-ai",
            "details": f"Analyse terminée. {len(locations)} lieux identifiés.",
            "timestamp": firestore.SERVER_TIMESTAMP
        })

        print(f"Analysis completed for {project_id}")
        
    except Exception as e:
        print(f"Error processing document: {e}")
        # Update Firestore with error
        db.collection("projects").document(project_id).update({
            "analysis.status": "ERROR",
            "analysis.error": str(e)
        })
    finally:
        # Cleanup
        if tmp_file_path and os.path.exists(tmp_file_path):
            os.remove(tmp_file_path)

@app.post("/analyze")
async def analyze_document(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Trigger an analysis job.
    Returns immediately and processes in background.
    """
    background_tasks.add_task(process_document, request.projectId, request.documentPath)
    return {"status": "accepted", "message": "Analysis started in background"}
