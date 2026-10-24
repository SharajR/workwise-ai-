/**
 * WorkWise AI - Assessment Module Server
 * NEWTHON Hackathon Project - Member 2
 * 
 * Built with native Node.js (Zero external dependencies)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ASSESSMENTS_FILE = path.join(DATA_DIR, 'assessments.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'anonymous_feedback.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types dictionary for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Assessment Questionnaire definition covering the 5 workplace rating questions (Q1-Q5)
const QUESTIONNAIRE = {
  categories: [
    {
      id: 'communication',
      title: 'Communication',
      icon: '💬',
      description: 'Effectiveness of communication within the workplace.',
      questions: [
        {
          id: 'Q1',
          text: 'Communication within my workplace is effective.'
        }
      ]
    },
    {
      id: 'teamwork',
      title: 'Teamwork',
      icon: '🤝',
      description: 'Cooperation and mutual support among team members.',
      questions: [
        {
          id: 'Q2',
          text: 'My team members cooperate and support one another.'
        }
      ]
    },
    {
      id: 'leadership',
      title: 'Leadership & Management',
      icon: '👔',
      description: 'Clarity of guidance and managerial support.',
      questions: [
        {
          id: 'Q3',
          text: 'My manager provides clear guidance and support.'
        }
      ]
    },
    {
      id: 'workload',
      title: 'Workload & Balance',
      icon: '⚖️',
      description: 'Reasonableness of workload and responsibilities.',
      questions: [
        {
          id: 'Q4',
          text: 'My workload is reasonable.'
        }
      ]
    },
    {
      id: 'jobSatisfaction',
      title: 'Job Satisfaction',
      icon: '⭐',
      description: 'Satisfaction with the overall work environment.',
      questions: [
        {
          id: 'Q5',
          text: 'I am satisfied with my work environment.'
        }
      ]
    }
  ],
  scale: [
    { value: 1, label: 'Strongly Disagree', badge: '1' },
    { value: 2, label: 'Disagree', badge: '2' },
    { value: 3, label: 'Neutral', badge: '3' },
    { value: 4, label: 'Agree', badge: '4' },
    { value: 5, label: 'Strongly Agree', badge: '5' }
  ],
  departments: [
    'Engineering',
    'HR',
    'Sales',
    'Operations',
    'Other'
  ],
  experienceRanges: [
    'Less than 1 year',
    '1–3 years',
    '4–6 years',
    '7+ years'
  ]
};

// Helper: Ensure data directory and files exist
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ASSESSMENTS_FILE)) {
    fs.writeFileSync(ASSESSMENTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2), 'utf8');
  }
}

// Helper: Read JSON file safely
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return [];
  }
}

// Helper: Write JSON file safely
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Helper: Generate unique ID
function generateId(prefix = 'ASMT') {
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomStr}`;
}

// Parse request body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Send JSON response
function sendJSON(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(payload);
}

// Calculate competency scores and overall score for Q1-Q5
function calculateScores(ratings) {
  const categories = {
    communication: ['Q1'],
    teamwork: ['Q2'],
    leadership: ['Q3'],
    workload: ['Q4'],
    jobSatisfaction: ['Q5']
  };

  const categoryScores = {};
  let totalRatingSum = 0;
  let totalQuestions = 0;

  for (const [cat, qIds] of Object.entries(categories)) {
    let catSum = 0;
    qIds.forEach(qId => {
      const val = Number(ratings[qId]) || 0;
      catSum += val;
      totalRatingSum += val;
      totalQuestions += 1;
    });
    const avg = catSum / qIds.length;
    // Normalized to 0-100% scale (matching Member 3 formula: (avg / 5.0) * 100)
    categoryScores[cat] = Math.round((avg / 5.0) * 1000) / 10;
  }

  const overallAvg = totalRatingSum / totalQuestions;
  const overallScore = Math.round((overallAvg / 5.0) * 1000) / 10;

  return { categoryScores, overallScore };
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ---------------- API ROUTES ----------------

  // 1. Health check
  if (pathname === '/api/health' && method === 'GET') {
    const assessments = readJSON(ASSESSMENTS_FILE);
    const feedback = readJSON(FEEDBACK_FILE);
    return sendJSON(res, 200, {
      status: 'ok',
      module: 'Workplace Assessment Module (Member 2)',
      timestamp: new Date().toISOString(),
      counts: {
        assessments: assessments.length,
        anonymousFeedback: feedback.length
      }
    });
  }

  // 2. Anonymous Employee Session (Zero Names or Emails Collected)
  if (pathname === '/api/user' && method === 'GET') {
    return sendJSON(res, 200, {
      role: 'Anonymous Contributor',
      isAnonymous: true,
      anonymityStatus: 'Strictly Protected (No Names or Emails Collected)',
      departments: QUESTIONNAIRE.departments,
      experienceRanges: QUESTIONNAIRE.experienceRanges
    });
  }

  // 3. Questionnaire schema and metadata
  if (pathname === '/api/questions' && method === 'GET') {
    return sendJSON(res, 200, QUESTIONNAIRE);
  }

  // 4. Retrieve assessment history (Requirement 8)
  if (pathname === '/api/assessments' && method === 'GET') {
    let assessments = readJSON(ASSESSMENTS_FILE);
    
    // Optional department filter
    const deptParam = parsedUrl.searchParams.get('department');
    if (deptParam && deptParam !== 'All') {
      assessments = assessments.filter(a => a.department === deptParam);
    }

    // Sort by latest timestamp first
    assessments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return sendJSON(res, 200, {
      success: true,
      count: assessments.length,
      data: assessments
    });
  }

  // 5. Retrieve specific assessment details
  if (pathname.startsWith('/api/assessments/') && method === 'GET') {
    const id = pathname.split('/')[3];
    const assessments = readJSON(ASSESSMENTS_FILE);
    const found = assessments.find(a => a.id === id);
    if (!found) {
      return sendJSON(res, 404, { error: 'Assessment not found' });
    }
    return sendJSON(res, 200, { success: true, data: found });
  }

  // 6. Retrieve anonymous feedback (Requirement 9: Decoupled, no PII)
  if (pathname === '/api/anonymous-feedback' && method === 'GET') {
    const feedbackList = readJSON(FEEDBACK_FILE);
    // Sort by latest first
    feedbackList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return sendJSON(res, 200, {
      success: true,
      count: feedbackList.length,
      data: feedbackList
    });
  }

  // 7. Submit new assessment (Requirements 1-7, 9)
  if (pathname === '/api/assessments' && method === 'POST') {
    try {
      const data = await parseBody(req);

      // Ensure strictly anonymous submission: explicitly strip any name or email if supplied
      delete data.name;
      delete data.email;
      delete data.userId;
      delete data.employeeName;
      delete data.employeeEmail;

      // Validate Step 1: Basic Information
      const errors = [];
      const validDepartments = QUESTIONNAIRE.departments;
      const validExperiences = QUESTIONNAIRE.experienceRanges;

      if (!data.department || typeof data.department !== 'string' || data.department.trim() === '') {
        errors.push('Department is required. Choose from: ' + validDepartments.join(', '));
      } else if (!validDepartments.includes(data.department.trim()) && !data.department.startsWith('Other')) {
        errors.push('Invalid department. Must be one of: ' + validDepartments.join(', '));
      }

      if (!data.experienceRange || typeof data.experienceRange !== 'string' || data.experienceRange.trim() === '') {
        errors.push('Experience range is required. Choose from: ' + validExperiences.join(', '));
      } else if (!validExperiences.includes(data.experienceRange.trim())) {
        errors.push('Invalid experience range. Must be one of: ' + validExperiences.join(', '));
      }

      // Validate Step 2: Rating Questions (Required, 1-5 scale for Q1-Q5)
      const expectedQuestions = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];

      const ratings = data.ratings || {};
      const missingQuestions = [];
      const invalidRatings = [];

      expectedQuestions.forEach(qId => {
        const val = ratings[qId];
        if (val === undefined || val === null || val === '') {
          missingQuestions.push(qId);
        } else {
          const num = Number(val);
          if (!Number.isInteger(num) || num < 1 || num > 5) {
            invalidRatings.push(qId);
          }
        }
      });

      if (missingQuestions.length > 0) {
        errors.push(`Missing answers for ${missingQuestions.length} rating question(s). All workplace statements must be rated.`);
      }
      if (invalidRatings.length > 0) {
        errors.push(`Invalid rating scores for: ${invalidRatings.join(', ')}. Ratings must be between 1 and 5.`);
      }

      // If validation fails, return 400 with descriptive error messages (Requirements 5 & 6)
      if (errors.length > 0) {
        return sendJSON(res, 400, {
          success: false,
          error: 'Validation failed',
          details: errors,
          missingQuestions
        });
      }

      // Compute structured scores
      const { categoryScores, overallScore } = calculateScores(ratings);

      // Generate unique IDs and timestamps (Requirement 7)
      const assessmentId = generateId('ASMT');
      const timestamp = new Date().toISOString();

      let feedbackId = null;
      let hasAnonymousFeedback = false;

      // Handle Anonymous Comments (Requirement 9: Separate from personal information)
      // Comments are saved into the separate anonymous feedback repository without any user identity
      const strengthsComment = (data.strengthsFeedback || '').trim();
      const improvementComment = (data.improvementFeedback || '').trim();

      if (strengthsComment || improvementComment) {
        feedbackId = generateId('FB');
        hasAnonymousFeedback = true;

        const feedbackRecord = {
          feedbackId,
          timestamp,
          primaryTheme: data.primaryTheme || 'General Workplace Culture',
          strengths: strengthsComment || 'None provided',
          areasForImprovement: improvementComment || 'None provided',
          tags: Array.isArray(data.themeTags) ? data.themeTags : ['Workplace']
        };

        const existingFeedback = readJSON(FEEDBACK_FILE);
        existingFeedback.push(feedbackRecord);
        writeJSON(FEEDBACK_FILE, existingFeedback);
      }

      // Construct structured assessment entry (Strictly Anonymous, No PII)
      const assessmentRecord = {
        id: assessmentId,
        timestamp,
        department: data.department.trim(),
        experienceRange: data.experienceRange.trim(),
        ratings,
        categoryScores,
        overallScore,
        hasAnonymousFeedback,
        feedbackId, // Decoupled link without personal identifying info
        status: 'Submitted'
      };

      const existingAssessments = readJSON(ASSESSMENTS_FILE);
      existingAssessments.push(assessmentRecord);
      writeJSON(ASSESSMENTS_FILE, existingAssessments);

      // Success response
      return sendJSON(res, 201, {
        success: true,
        message: 'Assessment submitted successfully.',
        assessmentId,
        timestamp,
        overallScore,
        categoryScores
      });

    } catch (err) {
      console.error('Submission error:', err);
      return sendJSON(res, 500, {
        success: false,
        error: 'Internal server error while processing assessment'
      });
    }
  }

  // ---------------- STATIC FILE SERVING ----------------

  let filePath = '';
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  } else if (pathname === '/history' || pathname === '/history.html') {
    filePath = path.join(PUBLIC_DIR, 'history.html');
  } else {
    // Sanitize path to prevent directory traversal
    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(PUBLIC_DIR, safePath);
  }

  // Check if file exists in public/
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

// Initialize files and start server
initStorage();

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  WorkWise AI - Assessment Module (Member 2)`);
    console.log(`  Server running at: http://localhost:${PORT}`);
    console.log(`  Survey Form:       http://localhost:${PORT}/`);
    console.log(`  History Page:      http://localhost:${PORT}/history`);
    console.log(`  Health API:        http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
  });
}

module.exports = { server, calculateScores, QUESTIONNAIRE, initStorage };
