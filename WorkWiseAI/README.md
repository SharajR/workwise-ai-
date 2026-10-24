# WorkWise AI - Workplace Assessment Module
## NEWTHON Hackathon Project — Member 2: Survey & Assessment Engine

---

### 1. Module Overview
This module is the core **Workplace Assessment and Survey Engine** for **WorkWise AI**.
It provides a modern, responsive, 3-step evaluation experience for employees to evaluate organizational health across five core competencies, while providing strict identity protection for qualitative feedback.

As **Member 2**, this module satisfies all competition requirements:
1. **Modern, Responsive Survey Form**: Sleek, glassmorphic UI built for desktop and mobile screens.
2. **3-Step Survey Structure**:
   - **Step 1: Basic Information**: Department (`Engineering`, `HR`, `Sales`, `Operations`, `Other`) and Experience (`Less than 1 year`, `1–3 years`, `4–6 years`, `7+ years`). Strictly avoids collecting names or emails to guarantee complete anonymity.
   - **Step 2: Workplace Rating Questions**: 5 workplace statements rated on a 1–5 scale:
     - **Q1**: *Communication within my workplace is effective.*
     - **Q2**: *My team members cooperate and support one another.*
     - **Q3**: *My manager provides clear guidance and support.*
     - **Q4**: *My workload is reasonable.*
     - **Q5**: *I am satisfied with my work environment.*
   - **Step 3: Anonymous Feedback & Review**: Decoupled qualitative commentary with pre-submission score review.
3. **1–5 Selectable Rating Scale**:
   - `1` = Strongly Disagree
   - `2` = Disagree
   - `3` = Neutral
   - `4` = Agree
   - `5` = Strongly Agree
5. **Interactive Controls & Validation**:
   - Live progress indicator with step status and progress bar.
   - Previous and Next navigation preserving entered responses.
   - Clear inline validation messages and error banners.
6. **Submission Guardrails**: Prevents submission whenever required questions or fields are missing.
7. **Structured Data Storage**: Saves completed assessments with a unique ID (`ASMT-2026-XXXXX`), ISO timestamp, detailed ratings, and category scores normalized to 0–100%.
8. **Assessment History Page**: Accessible at `/history`, providing summary KPIs, department filtering, search by ID, and detailed response breakdowns.
9. **Decoupled Anonymous Feedback**: Separates written comments from personally identifying information into an isolated anonymous feedback stream (`data/anonymous_feedback.json`) without employee name, email, or user ID.
10. **Team Integration**: Zero external npm dependencies; designed to interface seamlessly with Member 1 (Auth), Member 3 (AI & Analysis Engine), and Member 4 (Reporting).

---

### 2. File Structure

```
WorkWiseAI/
├── data/
│   ├── assessments.json            # Structured assessment records (scores, ratings, metadata)
│   └── anonymous_feedback.json     # Decoupled qualitative feedback (no PII)
├── public/
│   ├── css/
│   │   └── style.css               # Modern styling, responsive layout, color-coded rating scales
│   ├── js/
│   │   ├── api.js                  # Frontend API communication client
│   │   ├── app.js                  # 3-step survey flow, validation, and submission logic
│   │   └── history.js              # History analytics, department filters, and modal view
│   ├── index.html                  # 3-Step Workplace Assessment Survey Page
│   └── history.html                # Assessment History and Decoupled Feedback Page
├── server.js                       # Native Node.js HTTP server & REST API
├── test_assessment.js              # Automated test suite verifying all 10 requirements
├── start.bat                       # One-click Windows startup batch script
├── package.json                    # Project definition & scripts
└── README.md                       # Member 2 Documentation
```

---

### 3. How to Start the Application

#### Option A: Quick Windows Launcher
Double-click `start.bat` in the project folder, or run:
```powershell
.\start.bat
```

#### Option B: Using Node.js or Antigravity Node
In your terminal, navigate to `WorkWiseAI` and run:
```powershell
# Using Antigravity's built-in Node runtime:
agy-node server.js

# Or if standard Node.js is installed in PATH:
node server.js
```

The application will start on port `3000`:
- **Survey Form**: [http://localhost:3000/](http://localhost:3000/)
- **Assessment History**: [http://localhost:3000/history](http://localhost:3000/history)
- **Health API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

### 4. How to Run Automated Tests

To run the automated test suite verifying all 10 project requirements:
```powershell
agy-node test_assessment.js
```
*(Or `node test_assessment.js`)*

All 10 unit and integration tests will run and pass:
- Questionnaire structure covering 5 competencies.
- 1–5 scale configuration.
- Mathematical score normalization (0–100%).
- Validation of Step 1 required fields.
- Submission blocking when ratings are incomplete.
- Rejection of invalid scale values outside 1–5.
- Structured storage with unique ID and timestamp.
- Strict PII separation from anonymous feedback.
- Assessment history filtering and retrieval.

---

### 5. Architectural Alignment with Hackathon Team

- **Member 1 (Auth & User Management)**:
  Exposes the `/api/user` endpoint interface to ingest the active employee session and department while honoring anonymity boundaries.
- **Member 2 (Assessment Module - This Module)**:
  Handles user-facing survey collection, multi-step validation, scoring engine, structured persistence, and history exploration.
- **Member 3 (AI & Analysis Engine)**:
  The 0–100% normalized score calculation directly matches Member 3's formulas:
  $$\text{Percentage Score} = \left(\frac{\text{Average Score}}{5.0}\right) \times 100$$
  Anonymous comments are tagged with the 5 core themes (`Communication`, `Teamwork`, `Leadership`, `Workload`, `Training`) for Member 3's NLP scanner.
- **Member 4 (Reporting & Dashboard)**:
  Data in `data/assessments.json` and `data/anonymous_feedback.json` is formatted for straightforward ingestion into reporting and export pipelines.
