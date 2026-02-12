# Maintenance RAG POC

A proof-of-concept system for multi-site maintenance operations combining RAG (Retrieval-Augmented Generation) with structured maintenance data and work order management.

## 🎯 Overview

This system provides:
- **RAG-powered Q&A** from maintenance manuals and preventive maintenance docs
- **Structured queries** for schedules, employee qualifications, inventory
- **Work order management** with approval workflow
- **Tool-based architecture** preventing LLM hallucination

## 🏗️ Architecture

### Backend (FastAPI + PostgreSQL + pgvector)
- Python 3.11, FastAPI, Uvicorn
- PostgreSQL 16 with pgvector extension for embeddings
- sentence-transformers/all-MiniLM-L6-v2 (local, no API key needed)
- Optional OpenAI integration (feature flag)
- Strict tool-based queries (no operational data invention)

### Frontend (Next.js 14 + TypeScript)
- App Router with TypeScript
- Tailwind CSS + shadcn/ui-inspired components
- Mock mode for demo without backend
- Role switcher (User/Admin) for POC

## 📦 Project Structure

```
maint-rag-poc/
├── apps/
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   └── app/
│   │       ├── main.py              # FastAPI routes
│   │       ├── db.py                # Database connection & init
│   │       ├── schema.sql           # PostgreSQL schema
│   │       ├── seed.py              # Demo data seeding
│   │       ├── ingest/              # Document ingestion
│   │       │   ├── loaders.py
│   │       │   ├── chunking.py
│   │       │   ├── embed.py
│   │       │   └── vector_store.py
│   │       └── tools/               # Tool functions
│   │           ├── sql_tools.py     # Structured queries
│   │           ├── rag_tools.py     # RAG retrieval
│   │           └── router.py        # Intent routing
│   └── frontend/
│       ├── Dockerfile
│       ├── package.json
│       ├── app/
│       │   ├── chat/page.tsx        # Main chat interface
│       │   ├── work-orders/page.tsx # Work order management
│       │   └── data-health/page.tsx # Data ingestion UI
│       ├── components/              # React components
│       └── lib/
│           ├── api.ts               # Typed API client
│           ├── types.ts             # TypeScript types
│           └── utils.ts             # Utilities
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- 8GB+ RAM recommended

### 1. Environment Setup

Create `.env` file in the project root:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=maint_rag

# Backend
DATABASE_URL=postgresql://postgres:postgres@db:5432/maint_rag
USE_OPENAI=false
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Frontend
NEXT_PUBLIC_API_BASE=/api
NEXT_PUBLIC_MOCK_MODE=false
BACKEND_URL=http://backend:8000
```

### 2. Start Services

```bash
# From project root
docker compose up --build
```

This will start:
- **Database** (PostgreSQL + pgvector): `localhost:5432`
- **Backend** (FastAPI): `localhost:8000`
- **Frontend** (Next.js): `localhost:3000`
- **Nginx** (reverse proxy): `localhost:8080`

### 3. Initialize Demo Data

Open browser to `http://localhost:3000` and:

1. Navigate to **Data Health** page
2. Click **"Seed Demo Data"** to populate:
   - Sites (SITE-001)
   - Equipment (EQ-100, EQ-200)
   - Employees with certifications
   - Maintenance schedules
   - Inventory items

### 4. Try the Chat

Navigate to **Chat** page and try:

- "What's the next maintenance for EQ-100?"
- "Show me maintenance due this week"
- "Find qualified employees for hydraulics work"
- "Check spare parts for EQ-100"
- "Create a preventive maintenance work order for EQ-100"

## 📋 API Endpoints

### Chat
```
POST /chat
Body: {
  message: string,
  site_id?: string,
  equipment_uid?: string,
  date_range?: { start: string, end: string }
}
Response: {
  answer: string,
  evidence?: Evidence[],
  checks?: { schedule?, employees?, inventory? },
  suggested_work_order?: WorkOrder
}
```

### Work Orders
```
GET  /workorders?site_id=&status=
GET  /workorders/:id
POST /workorders/draft
POST /workorders/:id/approve
```

### Ingestion
```
POST /ingest/csv/{kind}        # kind: employees|schedules|inventory
POST /ingest/docs              # multipart file upload
```

### Utility
```
POST /seed                     # Seed demo data
GET  /health                   # Health check
```

## 🛠️ Tool-Based Architecture

The system uses deterministic functions to prevent hallucination:

### SQL Tools
- `get_next_maintenance(equipment_uid)` - Next scheduled maintenance
- `list_due_maintenance(site_id, start_date, end_date)` - Due maintenance window
- `find_qualified_employees(site_id, required_certs)` - Match certifications
- `check_employee_conflicts(employee_id, start_ts, end_ts)` - Availability check
- `check_inventory(site_id, part_id_or_name)` - Parts availability
- `create_work_order(payload, require_approval)` - Create work order
- `approve_work_order(work_order_id, admin_id)` - Approve work order

### RAG Tools
- Metadata-aware retrieval (filter by site_id, equipment_uid, doc_type)
- Returns evidence with source, section, snippet, score
- Supports both "manual" and "preventive" document types

### Intent Router
Analyzes user messages to determine which tools to call:
- Manual/procedure mentions → RAG (doc_type=manual)
- Preventive maintenance → RAG (doc_type=preventive)
- Schedule/next maintenance → SQL schedule tools
- Employee/assign/qualified → Employee tools + conflict check
- Spare/part/inventory → Inventory tools
- Create work order → Suggest work order draft

## 🎭 Role-Based Workflow

### User Role
- Can create work orders → Status: **PENDING_APPROVAL**
- Cannot approve work orders
- View own and approved work orders

### Admin Role
- Can create work orders → Status: **APPROVED** (auto-approved)
- Can approve pending work orders
- View all work orders

**Toggle role** using the button in top-right corner (POC only).

## 📊 Work Order Status Flow

```
DRAFT → PENDING_APPROVAL → APPROVED → SCHEDULED → IN_PROGRESS → DONE
                              ↓
                          REJECTED
```

## 📁 Data Ingestion

### CSV Format

**Employees:**
```csv
employee_id,site_id,name,certs
EMP-01,SITE-001,Avery Chen,"HYDRAULICS,LOCKOUT"
```

**Maintenance Schedules:**
```csv
site_id,equipment_uid,next_date,required_certs,est_duration_min
SITE-001,EQ-100,2026-02-15,"HYDRAULICS,LOCKOUT",120
```

**Inventory:**
```csv
site_id,part_id,part_name,qty,reorder_level
SITE-001,PART-100,Hydraulic Hose,4,2
```

### Document Upload

Supports PDF, DOCX, TXT files:
1. Select document type (Manual or Preventive)
2. Optionally specify site_id and equipment_uid for metadata filtering
3. Upload files - they will be:
   - Extracted to text
   - Chunked (~1200 chars with overlap)
   - Embedded (384-dim vectors)
   - Stored in PostgreSQL with pgvector

## 🧪 Development

### Backend Only
```bash
docker compose up --build db backend
```

Backend runs on `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

### Frontend Only (Mock Mode)
```bash
cd apps/frontend
npm install
NEXT_PUBLIC_MOCK_MODE=true npm run dev
```

Frontend runs on `http://localhost:3000` with mock responses.

### Run Tests
```bash
# Backend tests (if added)
cd apps/backend
pip install pytest
pytest

# Frontend tests (if added)
cd apps/frontend
npm test
```

## 🎨 UI Features

### Chat Page
- **Left panel**: Chat thread with message history
- **Right panel**: Context filters (site, equipment, date range)
- **Quick actions**: Pre-built query chips
- **Evidence display**: Show source citations and snippets
- **Checks display**: Show schedule/employee/inventory results
- **Work order suggestion**: Create button when bot suggests action

### Work Orders Page
- **Filterable table**: By site_id and status
- **Status badges**: Color-coded visual indicators
- **Details drawer**: Click row to see full work order
- **Admin actions**: Approve/Reject buttons (admin only)
- **Timeline**: Creation and approval timestamps

### Data Health Page
- **Quick seed**: Initialize demo data
- **CSV upload**: Bulk import employees, schedules, inventory
- **Document upload**: Ingest manuals and preventive docs
- **Stats cards**: System health metrics (placeholder)

## ⚙️ Configuration

### Enable OpenAI (Optional)

Set in `.env`:
```bash
USE_OPENAI=true
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Without OpenAI, system uses simple snippet extraction (still functional).

### Database Schema

Schema auto-initializes on first run. Tables:
- `sites`, `equipment`, `employees`, `employee_certs`
- `maintenance_schedule`, `inventory`
- `work_orders`, `assignments`
- `doc_chunks` (with vector column)

## 🔒 Security Notes (POC)

⚠️ **This is a POC without production security:**
- No real authentication (headers only)
- No rate limiting
- No input sanitization beyond basic validation
- Admin role toggle is client-side only

For production, implement:
- OAuth/JWT authentication
- Role-based access control (RBAC)
- Input validation & sanitization
- Rate limiting & DDoS protection
- Audit logging

## 📈 Scaling Considerations

For production scale:
1. **Separate vector store**: Use dedicated Pinecone/Weaviate/Qdrant
2. **Cache layer**: Redis for frequently accessed queries
3. **Queue system**: Celery/RQ for async document processing
4. **Horizontal scaling**: Multiple backend replicas behind load balancer
5. **Database replication**: Read replicas for queries
6. **CDN**: Static asset delivery
7. **Monitoring**: Prometheus + Grafana

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists and DATABASE_URL is correct
- Ensure PostgreSQL is running: `docker compose ps`
- View logs: `docker compose logs backend`

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:8000/health`
- Check NEXT_PUBLIC_API_BASE in frontend `.env`
- Try mock mode: `NEXT_PUBLIC_MOCK_MODE=true`

### Vector search returns no results
- Ensure documents are ingested: Check Data Health page
- Verify embeddings are created: Check database `doc_chunks` table
- Try broader queries

## 📝 License

MIT (for POC purposes)

## 👥 Contributors

Built as a senior backend/full-stack pair programming demonstration.
