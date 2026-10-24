/**
 * WorkWise AI - Assessment History Controller
 * Member 2 Implementation - Assessment History & Analytics
 */

document.addEventListener('DOMContentLoaded', async () => {
  let allAssessments = [];
  let allFeedback = [];
  let questionnaireData = null;

  // Elements
  const assessmentsTableBody = document.getElementById('assessments-tbody');
  const searchInput = document.getElementById('search-input');
  const deptFilter = document.getElementById('dept-filter');
  const emptyState = document.getElementById('empty-state');
  const modalOverlay = document.getElementById('details-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBody = document.getElementById('modal-detail-content');

  // Stats Elements
  const statTotalCount = document.getElementById('stat-total-count');
  const statAvgScore = document.getElementById('stat-avg-score');
  const statTopCategory = document.getElementById('stat-top-category');
  const statFocusCategory = document.getElementById('stat-focus-category');

  // Tab Switching (Assessments vs Anonymous Feedback)
  const tabAssessmentsBtn = document.getElementById('tab-assessments-btn');
  const tabFeedbackBtn = document.getElementById('tab-feedback-btn');
  const viewAssessmentsSection = document.getElementById('view-assessments');
  const viewFeedbackSection = document.getElementById('view-feedback');
  const feedbackListContainer = document.getElementById('feedback-list-container');

  tabAssessmentsBtn.addEventListener('click', () => {
    tabAssessmentsBtn.classList.add('active');
    tabFeedbackBtn.classList.remove('active');
    viewAssessmentsSection.style.display = 'block';
    viewFeedbackSection.style.display = 'none';
  });

  tabFeedbackBtn.addEventListener('click', () => {
    tabFeedbackBtn.classList.add('active');
    tabAssessmentsBtn.classList.remove('active');
    viewAssessmentsSection.style.display = 'none';
    viewFeedbackSection.style.display = 'block';
    renderFeedbackList();
  });

  // Load User Info (Member 1 Auth Integration)
  try {
    const user = await API.getCurrentUser();
    document.getElementById('nav-user-name').textContent = user.name;
    document.getElementById('nav-user-role').textContent = `${user.role} • ${user.department}`;
    document.getElementById('user-avatar').textContent = user.name.split(' ').map(n => n[0]).join('');
  } catch (e) {
    console.warn('Could not load user', e);
  }

  // Load Initial Data
  async function loadData() {
    try {
      questionnaireData = await API.getQuestionnaire();
      const resAssessments = await API.getAssessments();
      allAssessments = resAssessments.data || [];

      const resFeedback = await API.getAnonymousFeedback();
      allFeedback = resFeedback.data || [];

      calculateAndRenderStats();
      filterAndRenderTable();
    } catch (err) {
      console.error('Failed to load history data', err);
    }
  }

  // Calculate high level stats
  function calculateAndRenderStats() {
    statTotalCount.textContent = allAssessments.length;

    if (allAssessments.length === 0) {
      statAvgScore.textContent = '0%';
      statTopCategory.textContent = 'N/A';
      statFocusCategory.textContent = 'N/A';
      return;
    }

    const totalScoresSum = allAssessments.reduce((acc, curr) => acc + (curr.overallScore || 0), 0);
    const avgOverall = Math.round(totalScoresSum / allAssessments.length);
    statAvgScore.textContent = `${avgOverall}%`;

    // Aggregate category averages
    const catSums = {
      communication: 0,
      teamwork: 0,
      leadership: 0,
      workload: 0,
      jobSatisfaction: 0
    };

    allAssessments.forEach(item => {
      if (item.categoryScores) {
        for (const [k, v] of Object.entries(item.categoryScores)) {
          if (catSums[k] !== undefined) {
            catSums[k] += v;
          }
        }
      }
    });

    const catAverages = Object.entries(catSums).map(([cat, sum]) => ({
      cat,
      avg: sum / allAssessments.length
    }));

    catAverages.sort((a, b) => b.avg - a.avg);

    const friendlyNames = {
      communication: 'Communication',
      teamwork: 'Teamwork',
      leadership: 'Leadership',
      workload: 'Workload',
      jobSatisfaction: 'Job Satisfaction'
    };

    const topCat = catAverages[0];
    const lowestCat = catAverages[catAverages.length - 1];

    statTopCategory.textContent = `${friendlyNames[topCat.cat]} (${Math.round(topCat.avg)}%)`;
    statFocusCategory.textContent = `${friendlyNames[lowestCat.cat]} (${Math.round(lowestCat.avg)}%)`;
  }

  // Filter and Render Table
  function filterAndRenderTable() {
    const query = searchInput.value.toLowerCase().trim();
    const selectedDept = deptFilter.value;

    const filtered = allAssessments.filter(item => {
      const matchesSearch = !query ||
        item.id.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query) ||
        item.experienceRange.toLowerCase().includes(query);

      const matchesDept = selectedDept === 'All' || item.department === selectedDept;

      return matchesSearch && matchesDept;
    });

    assessmentsTableBody.innerHTML = '';

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    filtered.forEach(item => {
      const tr = document.createElement('tr');

      const dateObj = new Date(item.timestamp);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const formattedTime = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      let scoreClass = 'score-mid';
      if (item.overallScore >= 75) scoreClass = 'score-high';
      else if (item.overallScore < 50) scoreClass = 'score-low';

      tr.innerHTML = `
        <td>
          <strong style="color: var(--primary); font-family: monospace;">${item.id}</strong>
        </td>
        <td>
          <div style="font-weight: 600;">${formattedDate}</div>
          <div style="font-size: 11px; color: var(--slate-400);">${formattedTime}</div>
        </td>
        <td>
          <span class="badge badge-primary">${item.department}</span>
        </td>
        <td>${item.experienceRange}</td>
        <td>
          <span class="score-pill ${scoreClass}">${item.overallScore}%</span>
        </td>
        <td>
          ${item.hasAnonymousFeedback ? '<span class="badge badge-success">✓ Decoupled Note</span>' : '<span style="color: var(--slate-400); font-size: 12px;">—</span>'}
        </td>
        <td>
          <button class="btn btn-secondary btn-sm view-details-btn" data-id="${item.id}" style="padding: 6px 12px; font-size: 12px;">
            View Details
          </button>
        </td>
      `;

      tr.querySelector('.view-details-btn').addEventListener('click', () => {
        showDetailsModal(item);
      });

      assessmentsTableBody.appendChild(tr);
    });
  }

  // Render Anonymous Feedback Stream (Decoupled, no PII)
  function renderFeedbackList() {
    feedbackListContainer.innerHTML = '';

    if (allFeedback.length === 0) {
      feedbackListContainer.innerHTML = `
        <div class="card" style="text-align: center; color: var(--slate-400); padding: 40px;">
          No anonymous feedback entries submitted yet.
        </div>
      `;
      return;
    }

    allFeedback.forEach(fb => {
      const dateStr = new Date(fb.timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

      const card = document.createElement('div');
      card.className = 'card';
      card.style.marginBottom = '16px';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--slate-100); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge badge-slate" style="font-family: monospace;">${fb.feedbackId}</span>
            <span class="badge badge-primary">${fb.primaryTheme || 'General Feedback'}</span>
          </div>
          <span style="font-size: 12px; color: var(--slate-400);">${dateStr}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13.5px;">
          <div>
            <strong style="color: #059669; display: flex; align-items: center; gap: 4px;">
              <span>🌱</span> Positive Strengths:
            </strong>
            <p style="margin-top: 4px; color: var(--slate-700); padding-left: 24px;">${fb.strengths}</p>
          </div>
          <div>
            <strong style="color: #b45309; display: flex; align-items: center; gap: 4px;">
              <span>⚡</span> Areas for Improvement:
            </strong>
            <p style="margin-top: 4px; color: var(--slate-700); padding-left: 24px;">${fb.areasForImprovement}</p>
          </div>
          <div style="margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap;">
            ${(fb.tags || []).map(t => `<span class="badge badge-slate" style="font-size: 10.5px;">#${t}</span>`).join('')}
          </div>
        </div>
      `;

      feedbackListContainer.appendChild(card);
    });
  }

  // Show Details Modal for an Assessment
  function showDetailsModal(item) {
    document.getElementById('modal-asmt-id').textContent = item.id;

    let scoreClass = 'score-mid';
    if (item.overallScore >= 75) scoreClass = 'score-high';
    else if (item.overallScore < 50) scoreClass = 'score-low';

    const catScores = item.categoryScores || {};

    let categoryRows = '';
    const catTitles = {
      communication: '💬 Communication & Info Flow',
      teamwork: '🤝 Teamwork & Collaboration',
      leadership: '👔 Leadership & Management',
      workload: '⚖️ Workload & Work-Life Balance',
      jobSatisfaction: '⭐ Job Satisfaction & Fulfillment'
    };

    for (const [k, title] of Object.entries(catTitles)) {
      const score = catScores[k] || 0;
      categoryRows += `
        <div class="score-bar-row" style="margin-bottom: 10px;">
          <span class="score-bar-title" style="width: 220px; font-size: 13px;">${title}</span>
          <div class="score-bar-track">
            <div class="score-bar-fill" style="width: ${score}%;"></div>
          </div>
          <span class="score-bar-val">${score}%</span>
        </div>
      `;
    }

    modalBody.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
        <div class="review-stat-item">
          <div class="review-stat-label">Department</div>
          <div class="review-stat-val">${item.department}</div>
        </div>
        <div class="review-stat-item">
          <div class="review-stat-label">Experience</div>
          <div class="review-stat-val">${item.experienceRange}</div>
        </div>
        <div class="review-stat-item">
          <div class="review-stat-label">Overall Score</div>
          <div class="review-stat-val"><span class="score-pill ${scoreClass}">${item.overallScore}%</span></div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 16px; padding: 18px;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px;">Competency Score Breakdown</h4>
        <div class="category-score-bars">
          ${categoryRows}
        </div>
      </div>

      <div class="card" style="padding: 18px;">
        <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">Question Rating Responses (1–5 Scale)</h4>
        <div style="font-size: 12.5px; display: flex; flex-direction: column; gap: 8px;">
          ${Object.entries(item.ratings || {}).map(([qId, val]) => {
            const qTexts = {
              Q1: 'Communication within my workplace is effective.',
              Q2: 'My team members cooperate and support one another.',
              Q3: 'My manager provides clear guidance and support.',
              Q4: 'My workload is reasonable.',
              Q5: 'I am satisfied with my work environment.'
            };
            const labels = ['', 'Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--slate-50); border-radius: 6px; border: 1px solid var(--slate-200);">
                <div>
                  <span style="font-family: monospace; font-weight: 700; color: var(--primary); margin-right: 8px;">${qId}</span>
                  <span style="color: var(--slate-700);">${qTexts[qId] || qId}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <strong style="color: var(--primary); font-size: 13px;">${val}/5</strong>
                  <span style="font-size: 11px; color: var(--slate-400);">(${labels[val] || ''})</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    modalOverlay.classList.add('show');
  }

  modalCloseBtn.addEventListener('click', () => {
    modalOverlay.classList.remove('show');
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.classList.remove('show');
    }
  });

  // Filter Listeners
  searchInput.addEventListener('input', filterAndRenderTable);
  deptFilter.addEventListener('change', filterAndRenderTable);

  // Initial Load
  loadData();
});
