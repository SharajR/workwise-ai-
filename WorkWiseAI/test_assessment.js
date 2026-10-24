/**
 * WorkWise AI - Automated Test Suite for Member 2 Assessment Module
 * NEWTHON Hackathon - Verifies all requirements including Step 1 & Step 2 refinements
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const stream = require('stream');
const EventEmitter = require('events');
const { server, calculateScores, QUESTIONNAIRE, initStorage } = require('./server');

let passedCount = 0;
let failedCount = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${err.message}`);
    failedCount++;
  }
}

async function runAsyncTest(testName, fn) {
  try {
    await fn();
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(`         ${err.message}`);
    failedCount++;
  }
}

// In-process HTTP dispatcher (Zero TCP sockets required)
function dispatchRequest(method, requestUrl, data = null) {
  return new Promise((resolve, reject) => {
    const req = new stream.Readable();
    req._read = () => {};
    req.method = method;
    req.url = requestUrl;
    req.headers = {
      'content-type': 'application/json'
    };

    if (data) {
      const payload = JSON.stringify(data);
      req.push(payload);
    }
    req.push(null); // End of stream

    // Mock response
    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.writeHead = function (status, headers) {
      res.statusCode = status;
      if (headers) Object.assign(res._headers, headers);
      return res;
    };

    let body = '';
    res.write = function (chunk) {
      if (chunk) body += chunk.toString();
      return true;
    };

    res.end = function (chunk) {
      if (chunk) body += chunk.toString();
      let parsed = body;
      try {
        parsed = JSON.parse(body);
      } catch (e) {
        // Keep as string
      }
      resolve({ status: res.statusCode, headers: res._headers, data: parsed, body });
    };

    server.emit('request', req, res);
  });
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('  WorkWise AI - Member 2 Assessment Module Test Suite');
  console.log('===============================================================');

  initStorage();

  // Test 1: Step 2 Refinement: Exact 5 Questions (Q1-Q5) and 1-5 Rating Scale
  runTest('Step 2 Refinement: Exactly 5 questions (Q1–Q5) with 1–5 scale', () => {
    const expectedQuestions = {
      Q1: 'Communication within my workplace is effective.',
      Q2: 'My team members cooperate and support one another.',
      Q3: 'My manager provides clear guidance and support.',
      Q4: 'My workload is reasonable.',
      Q5: 'I am satisfied with my work environment.'
    };

    const flatQuestions = {};
    QUESTIONNAIRE.categories.forEach(cat => {
      cat.questions.forEach(q => {
        flatQuestions[q.id] = q.text;
      });
    });

    assert.deepStrictEqual(flatQuestions, expectedQuestions, 'Question texts and IDs must match Q1-Q5');

    // Check 1-5 scale
    assert.strictEqual(QUESTIONNAIRE.scale.length, 5, 'Scale must have 5 values');
    const scaleLabels = QUESTIONNAIRE.scale.map(s => s.label);
    assert.deepStrictEqual(scaleLabels, [
      'Strongly Disagree',
      'Disagree',
      'Neutral',
      'Agree',
      'Strongly Agree'
    ]);
  });

  // Test 2: Step 1 Exact Department and Experience Requirements
  runTest('Step 1 Refinement: Exact departments and experience tiers defined', () => {
    const expectedDepartments = ['Engineering', 'HR', 'Sales', 'Operations', 'Other'];
    const expectedExperiences = ['Less than 1 year', '1–3 years', '4–6 years', '7+ years'];

    assert.deepStrictEqual(QUESTIONNAIRE.departments, expectedDepartments);
    assert.deepStrictEqual(QUESTIONNAIRE.experienceRanges, expectedExperiences);
  });

  // Test 3: Normalized Score Calculations for Q1-Q5 (0-100%)
  runTest('Req 3: Normalized Scoring calculates correct percentages for Q1-Q5', () => {
    const sampleRatings = {
      Q1: 5, // 100%
      Q2: 4, // 80%
      Q3: 3, // 60%
      Q4: 2, // 40%
      Q5: 1  // 20%
    };

    const { categoryScores, overallScore } = calculateScores(sampleRatings);

    assert.strictEqual(categoryScores.communication, 100.0);
    assert.strictEqual(categoryScores.teamwork, 80.0);
    assert.strictEqual(categoryScores.leadership, 60.0);
    assert.strictEqual(categoryScores.workload, 40.0);
    assert.strictEqual(categoryScores.jobSatisfaction, 20.0);
    assert.strictEqual(overallScore, 60.0);
  });

  // Test 4: Health Endpoint
  await runAsyncTest('Req 10: Health API endpoint reports healthy status', async () => {
    const res = await dispatchRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert(res.data.counts !== undefined);
  });

  // Test 5: Validation - Missing Step 1 Basic Information
  await runAsyncTest('Req 5 & 6: Rejects submission missing department/experience', async () => {
    const invalidPayload = {
      ratings: { Q1: 5, Q2: 5, Q3: 4, Q4: 4, Q5: 4 }
    };

    const res = await dispatchRequest('POST', '/api/assessments', invalidPayload);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert(res.data.details.some(d => d.includes('Department is required')));
    assert(res.data.details.some(d => d.includes('Experience range is required')));
  });

  // Test 6: Validation - Missing Step 2 Workplace Rating Questions (Q1-Q5)
  await runAsyncTest('Req 6: Prevents submission when any of Q1-Q5 ratings are missing', async () => {
    const incompletePayload = {
      department: 'Engineering',
      experienceRange: '1–3 years',
      ratings: {
        Q1: 4
        // Q2, Q3, Q4, Q5 missing!
      }
    };

    const res = await dispatchRequest('POST', '/api/assessments', incompletePayload);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert(res.data.details.some(d => d.includes('Missing answers for 4 rating question(s)')));
  });

  // Test 7: Validation - Out of range ratings (not 1-5)
  await runAsyncTest('Req 3 & 6: Rejects invalid rating scale values outside 1-5', async () => {
    const badScalePayload = {
      department: 'Engineering',
      experienceRange: '4–6 years',
      ratings: {
        Q1: 6, // Invalid > 5
        Q2: 0, // Invalid < 1
        Q3: 4, Q4: 3, Q5: 4
      }
    };

    const res = await dispatchRequest('POST', '/api/assessments', badScalePayload);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    assert(res.data.details.some(d => d.includes('Ratings must be between 1 and 5')));
  });

  // Test 8: Successful Assessment Submission (Step 1 + Step 2)
  let submittedId = null;
  await runAsyncTest('Req 7: Saves assessment with valid department, experience & Q1-Q5 ratings', async () => {
    const validPayload = {
      department: 'Engineering',
      experienceRange: '4–6 years',
      ratings: {
        Q1: 4,
        Q2: 5,
        Q3: 4,
        Q4: 3,
        Q5: 4
      },
      strengthsFeedback: 'Strong teamwork and clear communication.',
      improvementFeedback: 'Need better workload distribution during sprints.',
      primaryTheme: 'Workload, Burnout & Work-Life Balance',
      themeTags: ['Workload', 'Teamwork']
    };

    const res = await dispatchRequest('POST', '/api/assessments', validPayload);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert(res.data.assessmentId.startsWith('ASMT-'), 'Assessment ID must start with ASMT-');
    assert(res.data.timestamp !== undefined);
    assert.strictEqual(typeof res.data.overallScore, 'number');
    assert.strictEqual(res.data.overallScore, 80.0); // (4+5+4+3+4)/5 / 5.0 * 100 = 80.0%
    submittedId = res.data.assessmentId;
  });

  // Test 9: Anonymity Enforcement (Avoid collecting names or emails)
  await runAsyncTest('Step 1 Anonymity: Strictly avoids saving names, emails, or PII', async () => {
    const sneakyPayloadWithPII = {
      name: 'John Doe',
      email: 'john.doe@company.com',
      userId: 'EMP-9999',
      employeeName: 'John Doe',
      department: 'HR',
      experienceRange: '7+ years',
      ratings: {
        Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 5
      },
      strengthsFeedback: 'Excellent leadership support.'
    };

    const res = await dispatchRequest('POST', '/api/assessments', sneakyPayloadWithPII);
    assert.strictEqual(res.status, 201);
    const asmtId = res.data.assessmentId;

    // Fetch the created record
    const fetchRes = await dispatchRequest('GET', `/api/assessments/${asmtId}`);
    const record = fetchRes.data.data;

    // Verify ZERO PII fields exist
    assert.strictEqual(record.name, undefined, 'Name must never be stored');
    assert.strictEqual(record.email, undefined, 'Email must never be stored');
    assert.strictEqual(record.userId, undefined, 'UserId must never be stored');
    assert.strictEqual(record.employeeName, undefined, 'EmployeeName must never be stored');
    assert.strictEqual(record.employeeEmail, undefined, 'EmployeeEmail must never be stored');

    // Verify stored fields are only demographic aggregate and ratings
    assert.strictEqual(record.department, 'HR');
    assert.strictEqual(record.experienceRange, '7+ years');
    assert.deepStrictEqual(record.ratings, { Q1: 5, Q2: 5, Q3: 5, Q4: 5, Q5: 5 });
  });

  // Test 10: Separation of Anonymous Comments from PII (Req 9)
  await runAsyncTest('Req 9: Strict separation of anonymous comments from personally identifying information', async () => {
    // 1. Check anonymous feedback file
    const feedbackRes = await dispatchRequest('GET', '/api/anonymous-feedback');
    assert.strictEqual(feedbackRes.status, 200);
    assert(feedbackRes.data.data.length > 0);

    // Verify each feedback entry does NOT have employee name, email, or user ID
    feedbackRes.data.data.forEach(fb => {
      assert.strictEqual(fb.userId, undefined, 'Anonymous feedback must not have userId');
      assert.strictEqual(fb.name, undefined, 'Anonymous feedback must not have employee name');
      assert.strictEqual(fb.email, undefined, 'Anonymous feedback must not have employee email');
      assert(fb.feedbackId.startsWith('FB-'), 'Must have decoupled feedbackId');
    });

    // 2. Check assessment records do NOT store raw personal comments
    const asmtRes = await dispatchRequest('GET', `/api/assessments/${submittedId}`);
    assert.strictEqual(asmtRes.status, 200);
    const asmt = asmtRes.data.data;
    assert.strictEqual(asmt.strengthsFeedback, undefined);
    assert.strictEqual(asmt.improvementFeedback, undefined);
    assert(asmt.feedbackId.startsWith('FB-'), 'Assessment references decoupled feedbackId only');
  });

  // Test 11: Assessment History Page Retrieval & Filtering
  await runAsyncTest('Req 8: Retrieves assessment history and filters by department', async () => {
    const resAll = await dispatchRequest('GET', '/api/assessments');
    assert.strictEqual(resAll.status, 200);
    assert(resAll.data.data.length >= 1);

    // Filter by Engineering
    const resFiltered = await dispatchRequest('GET', '/api/assessments?department=Engineering');
    assert.strictEqual(resFiltered.status, 200);
    assert(resFiltered.data.data.every(a => a.department === 'Engineering'));
  });

  console.log('\n===============================================================');
  console.log(`  Tests Completed: ${passedCount + failedCount}`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${failedCount}`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests };
