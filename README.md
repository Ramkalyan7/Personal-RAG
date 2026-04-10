# Personal RAG

Personal RAG is a full-stack retrieval-augmented generation application for creating private, project-based knowledge spaces. Users can upload their own content, index it, and chat with an assistant that answers only from the data stored inside the selected project.

The UI branding currently uses the name `Ask Vault`, but the repository is a personal RAG system focused on authenticated users, project isolation, hybrid retrieval, and grounded chat over uploaded knowledge.

## What The Project Is About

This project is built to solve a practical RAG use case: let a user create separate knowledge bases for different topics, teams, or documents, then ask questions against only that project's data.

Instead of treating all uploaded content as one global dataset, the app keeps everything project-scoped:

- each user has their own account
- each account can create multiple projects
- each project has its own uploads
- each project's chunks are stored in a dedicated Pinecone namespace
- each chat only retrieves from the currently selected project

That makes the system useful for personal knowledge management, document Q&A, research collections, internal notes, course material, or any workflow where retrieval boundaries matter.

## Core Features

- User signup, login, and authenticated sessions with JWT
- Multi-project workspace for organizing knowledge into separate contexts
- Upload support for multiple source types:
  - PDF files
  - text-based files: `.txt`, `.md`, `.csv`, `.json`
  - audio files: `.mp3`, `.wav`, `.m4a`, `.aac`, `.ogg`, `.flac`
  - YouTube URLs
  - website URLs
- Automatic text extraction from each supported source type
- Text chunking for retrieval-ready document segmentation
- Dense embeddings for semantic similarity search
- Sparse embeddings for lexical keyword-aware retrieval
- Hybrid retrieval in Pinecone using dense + sparse vectors
- Project-isolated vector storage using one namespace per project
- Grounded answer generation using only retrieved context
- Streaming responses in chat with Server-Sent Events
- Persistent chat history stored per project
- Upload tracking so each project knows what content has been indexed

## Tech Stack

### Frontend

- React 19 for the UI
- TypeScript for type-safe frontend code
- Vite for the development/build toolchain
- React Router for routing and protected pages
- Tailwind CSS for styling
- Lucide React for icons

### Backend

- FastAPI for the API layer
- SQLAlchemy for ORM and relational data access
- PostgreSQL for persistent application data
- Pydantic for request/response schemas and validation
- JWT authentication with `python-jose`
- `bcrypt` for password hashing

### RAG And AI Tooling

- Google GenAI SDK for:
  - dense embeddings via `gemini-embedding-001`
  - answer generation via `gemini-2.5-flash`
- Pinecone for:
  - vector storage
  - sparse embedding inference
  - hybrid retrieval
- Groq for audio transcription using Whisper
- LangChain text splitters for chunking
- `tiktoken` for token-aware splitting support

### Content Extraction Tools

- `pypdf` for PDF text extraction
- `beautifulsoup4` for website text extraction
- `requests` for fetching website content
- `youtube-transcript-api` for YouTube transcript extraction

## RAG Flow

This repository implements a project-scoped hybrid RAG pipeline. The full flow is:

### 1. Source Ingestion

A user creates a project and uploads one source at a time. A source can be:

- a file
- a YouTube URL
- a website URL

The upload endpoint validates the input and rejects unsupported file types or invalid URLs.

### 2. Text Extraction

The backend converts the input into plain text:

- PDFs are parsed with `pypdf`
- text files are decoded directly
- audio files are transcribed with Groq Whisper
- YouTube videos are converted through transcript extraction
- websites are fetched and cleaned with BeautifulSoup

At the end of this step, every source becomes normalized text that can move through the same downstream RAG pipeline.

### 3. Chunking

The extracted text is split with `RecursiveCharacterTextSplitter`.

Current chunking settings:

- chunk size: `512`
- chunk overlap: `100`
- separators: paragraph, newline, sentence, space, fallback character split

The goal here is to break long documents into retrieval-friendly units while keeping enough local context inside each chunk.

### 4. Dense Embedding Generation

Each chunk is embedded with Google's embedding model using the document retrieval task type.

Dense embeddings are used to capture semantic similarity, so the system can retrieve meaningfully related content even when exact words do not match the query.

### 5. Sparse Embedding Generation

Each chunk also gets a sparse vector from Pinecone's sparse inference model.

Sparse vectors preserve lexical matching behavior, which helps when a question depends on exact terms, names, phrases, or domain-specific wording.

### 6. Hybrid Vector Storage

For every chunk, the app stores:

- the dense vector
- the sparse vector
- metadata including:
  - project id
  - chunk number
  - chunk text

Chunks are written into Pinecone under a namespace shaped like `project-<project_id>`.

This is the key isolation boundary in the retrieval layer. A query for one project only searches that project's namespace.

### 7. Query Embedding

When the user asks a question:

- the question gets a dense query embedding from Google
- the question gets a sparse query embedding from Pinecone

This mirrors the same hybrid representation used during indexing.

### 8. Retrieval

The backend queries Pinecone with:

- the dense query vector
- the sparse query vector
- the current project's namespace
- a configurable `top_k`

The result is a hybrid retrieval step that combines semantic search and lexical search, scoped strictly to the selected project.

### 9. Context Assembly

The retrieved matches are converted into a context list by reading the stored chunk text from metadata.

Only retrieved chunks are passed to the generation stage. If no chunks are found, the system returns an error instead of fabricating an answer.

### 10. Grounded Generation

The backend builds a strict prompt instructing the model to:

- answer only from the provided context
- avoid unsupported assumptions
- return a fallback response if the context is insufficient

This reduces hallucination risk and keeps responses tied to retrieved evidence instead of the model's general background knowledge.

### 11. Streaming Response

For chat, the app can stream the response token-by-token using Server-Sent Events.

The frontend appends assistant deltas as they arrive, which gives the user a real-time chat experience rather than waiting for the full answer at the end.

### 12. Persistence

After a successful interaction:

- the user message is stored in PostgreSQL
- the assistant response is stored in PostgreSQL
- the conversation can be reloaded later for that project

This means PostgreSQL stores application state and chat history, while Pinecone stores retrieval data.

## Why This RAG Design Matters

This project is not just "upload files and chat." Its design decisions are intentional:

- project-scoped namespaces prevent cross-project retrieval leakage
- hybrid retrieval improves recall over dense-only search
- strict prompting keeps the answer grounded in retrieved text
- separate relational and vector storage keeps responsibilities clear
- multiple ingestion paths make the system useful beyond static PDFs

## Summary

Personal RAG is a practical end-to-end RAG application built with React, FastAPI, PostgreSQL, Pinecone, Gemini, and Groq. It supports authenticated users, project-based knowledge isolation, multi-source ingestion, hybrid retrieval, and grounded chat over user-provided data.
