/**
 * WorkWise AI - Workplace Assessment Module
 * Member 2 Implementation - 3-Step Survey Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // State
  let currentStep = 1;
  let questionnaireData = null;
  const assessmentData = {
    department: '',
    experienceRange: '',
    ratings: {},
    strengthsFeedback: '',
    improvementFeedback: '',
    primaryTheme: 'General Workplace Culture',
    themeTags: []
  };

  // Elements
  const step1El = document.getElementById('step-1');
  const step2El = document.getElementById('step-2');
  const step3El = document.getElementById('step-3');
  const successCardEl = document.getElementById('success-card');
  const surveyFormEl = document.getElementById('survey-form-container');

  const btnStep1Next = document.getElementById('btn-step1-next');
  const btnStep2Back = document.getElementById('btn-step2-back');
  const btnStep2Next = document.getElementById('btn-step2-next');
  const btnStep3Back = document.getElementById('btn-step3-back');
  const btnSubmit = document.getElementById('btn-submit-assessment');

  const alertBanner = document.getElementById('alert-banner');
  const alertTitle = document.getElementById('alert-title');
  const alertMessage = document.getElementById('alert-message');

  const stepperItems = document.querySelectorAll('.step-item');
  const stepperProgressBar = document.getElementById('stepper-progress-bar');
  const questionsContainer = document.getElementById('questions-container');
  const answeredCounter = document.getElementById('answered-counter');

  // Handle "Other" Department custom text field toggle
  const deptSelect = document.getElementById('dept-select');
  const deptOtherGroup = document.getElementById('dept-other-group');
  const deptOtherInput = document.getElementById('dept-other-input');

  if (deptSelect && deptOtherGroup) {
    deptSelect.addEventListener('change', () => {
      if (deptSelect.value === 'Other') {
        deptOtherGroup.style.display = 'block';
        deptOtherInput.focus();
      } else {
        deptOtherGroup.style.display = 'none';
        if (deptOtherInput) {
          deptOtherInput.value = '';
          deptOtherInput.classList.remove('is-invalid');
        }
      }
    });
  }

  // Load Questionnaire Schema
  try {
    questionnaireData = await API.getQuestionnaire();
    renderQuestions(questionnaireData);
  } catch (err) {
    console.error('Failed to load questionnaire', err);
    showAlert('Failed to load assessment questionnaire. Please refresh.', 'danger');
  }

  // Helper: Display Alert Banner
  function showAlert(message, type = 'danger', title = 'Validation Error') {
    alertBanner.className = `alert-banner alert-${type} show`;
    alertTitle.textContent = title;
    
    if (Array.isArray(message)) {
      alertMessage.innerHTML = `<ul style="margin: 4px 0 0 16px;">${message.map(m => `<li>${m}</li>`).join('')}</ul>`;
    } else {
      alertMessage.textContent = message;
    }

    alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    alertBanner.className = 'alert-banner';
    alertMessage.textContent = '';
  }

  // Helper: Update Stepper UI
  function updateStepper() {
    stepperItems.forEach(item => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      item.classList.remove('active', 'completed');
      if (step === currentStep) {
        item.classList.add('active');
      } else if (step < currentStep) {
        item.classList.add('completed');
        const circle = item.querySelector('.step-circle');
        circle.innerHTML = '✓';
      } else {
        const circle = item.querySelector('.step-circle');
        circle.innerHTML = step;
      }
    });

    const progressPercentage = ((currentStep - 1) / 2) * 100;
    stepperProgressBar.style.width = `${progressPercentage}%`;
  }

  // Switch between Steps
  function goToStep(stepNumber) {
    hideAlert();
    currentStep = stepNumber;

    step1El.classList.remove('active');
    step2El.classList.remove('active');
    step3El.classList.remove('active');

    if (currentStep === 1) {
      step1El.classList.add('active');
    } else if (currentStep === 2) {
      step2El.classList.add('active');
      updateAnsweredCount();
    } else if (currentStep === 3) {
      step3El.classList.add('active');
      populateReviewSummary();
    }

    updateStepper();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Render Step 2 Questions dynamically
  function renderQuestions(data) {
    questionsContainer.innerHTML = '';
    let globalQIndex = 1;

    data.categories.forEach(cat => {
      const catBlock = document.createElement('div');
      catBlock.className = 'category-block';

      catBlock.innerHTML = `
        <div class="category-header">
          <div class="category-icon-box">${cat.icon}</div>
          <div class="category-info">
            <h3>${cat.title}</h3>
            <p>${cat.description}</p>
          </div>
        </div>
      `;

      cat.questions.forEach(q => {
        const qItem = document.createElement('div');
        qItem.className = 'question-item';
        qItem.id = `q-card-${q.id}`;

        let scaleButtonsHtml = '';
        data.scale.forEach(s => {
          scaleButtonsHtml += `
            <div class="rating-option" data-score="${s.value}">
              <input type="radio" name="q_${q.id}" id="q_${q.id}_${s.value}" value="${s.value}">
              <label for="q_${q.id}_${s.value}" class="rating-label">
                <span class="rating-num">${s.badge}</span>
                <span class="rating-text">${s.label}</span>
              </label>
            </div>
          `;
        });

        qItem.innerHTML = `
          <div class="question-prompt">
            <span class="q-number">${q.id}</span>
            <span>${q.text}</span>
          </div>
          <div class="rating-scale-group">
            ${scaleButtonsHtml}
          </div>
          <div class="invalid-feedback" id="feedback-${q.id}">Please select a rating from 1 to 5 for this statement.</div>
        `;

        // Radio change listener
        qItem.querySelectorAll('input[type="radio"]').forEach(radio => {
          radio.addEventListener('change', (e) => {
            assessmentData.ratings[q.id] = parseInt(e.target.value, 10);
            qItem.classList.remove('has-error');
            updateAnsweredCount();
          });
        });

        catBlock.appendChild(qItem);
      });

      questionsContainer.appendChild(catBlock);
    });

    updateAnsweredCount();
  }

  // Update Answered counter
  function updateAnsweredCount() {
    if (!questionnaireData) return;
    const totalQuestions = questionnaireData.categories.reduce((acc, c) => acc + c.questions.length, 0);
    const answeredCount = Object.keys(assessmentData.ratings).length;
    answeredCounter.textContent = `${answeredCount} of ${totalQuestions} questions answered`;

    if (answeredCount === totalQuestions) {
      answeredCounter.style.color = 'var(--success)';
      answeredCounter.style.fontWeight = '700';
    } else {
      answeredCounter.style.color = 'var(--slate-400)';
      answeredCounter.style.fontWeight = '500';
    }
  }

  // Step 1 Validation (Strictly Anonymous: Department & Experience)
  btnStep1Next.addEventListener('click', () => {
    const dept = document.getElementById('dept-select');
    const exp = document.getElementById('exp-select');
    const otherInput = document.getElementById('dept-other-input');

    let isValid = true;
    const errors = [];

    // Reset styles
    dept.classList.remove('is-invalid');
    exp.classList.remove('is-invalid');
    if (otherInput) otherInput.classList.remove('is-invalid');

    if (!dept.value) {
      dept.classList.add('is-invalid');
      errors.push('Please select your department (Engineering, HR, Sales, Operations, Other).');
      isValid = false;
    } else if (dept.value === 'Other' && (!otherInput.value || otherInput.value.trim() === '')) {
      otherInput.classList.add('is-invalid');
      errors.push('Please specify your department.');
      isValid = false;
    }

    if (!exp.value) {
      exp.classList.add('is-invalid');
      errors.push('Please select your experience range (Less than 1 year, 1–3 years, 4–6 years, 7+ years).');
      isValid = false;
    }

    if (!isValid) {
      showAlert(errors, 'danger', 'Missing Basic Information');
      return;
    }

    // Save Step 1 state (Strictly anonymous, no PII)
    assessmentData.department = (dept.value === 'Other' && otherInput && otherInput.value.trim())
      ? `Other (${otherInput.value.trim()})`
      : dept.value;
    assessmentData.experienceRange = exp.value;

    goToStep(2);
  });

  // Step 2 Navigation & Validation
  btnStep2Back.addEventListener('click', () => {
    goToStep(1);
  });

  btnStep2Next.addEventListener('click', () => {
    if (!questionnaireData) return;

    let hasErrors = false;
    let firstErrorElement = null;
    const unratedList = [];

    questionnaireData.categories.forEach(cat => {
      cat.questions.forEach(q => {
        const val = assessmentData.ratings[q.id];
        const card = document.getElementById(`q-card-${q.id}`);
        if (!val || val < 1 || val > 5) {
          hasErrors = true;
          unratedList.push(q.id);
          card.classList.add('has-error');
          if (!firstErrorElement) {
            firstErrorElement = card;
          }
        } else {
          card.classList.remove('has-error');
        }
      });
    });

    if (hasErrors) {
      showAlert(
        `You have ${unratedList.length} unrated statement(s). Every workplace question must be answered on the 1–5 scale to ensure statistically valid assessment scores.`,
        'danger',
        'Required Ratings Incomplete'
      );
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    goToStep(3);
  });

  // Step 3 Navigation & Review Summary
  btnStep3Back.addEventListener('click', () => {
    goToStep(2);
  });

  function populateReviewSummary() {
    // Populate Metadata review (Department & Experience)
    document.getElementById('rev-dept').textContent = assessmentData.department;
    document.getElementById('rev-exp').textContent = assessmentData.experienceRange;

    // Calculate preliminary scores for review display for Q1-Q5
    const catMap = {
      communication: ['Q1'],
      teamwork: ['Q2'],
      leadership: ['Q3'],
      workload: ['Q4'],
      jobSatisfaction: ['Q5']
    };

    const previewScoresContainer = document.getElementById('review-score-bars');
    previewScoresContainer.innerHTML = '';

    let totalSum = 0;
    let totalQuestions = 0;

    questionnaireData.categories.forEach(cat => {
      const qIds = catMap[cat.id] || [];
      let catSum = 0;
      qIds.forEach(id => {
        catSum += assessmentData.ratings[id] || 0;
        totalSum += assessmentData.ratings[id] || 0;
        totalQuestions += 1;
      });
      const avg = qIds.length ? (catSum / qIds.length) : 0;
      const scorePct = Math.round((avg / 5.0) * 100);

      const row = document.createElement('div');
      row.className = 'score-bar-row';
      row.innerHTML = `
        <span class="score-bar-title">${cat.icon} ${cat.title.split('&')[0]}</span>
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width: ${scorePct}%;"></div>
        </div>
        <span class="score-bar-val">${scorePct}%</span>
      `;
      previewScoresContainer.appendChild(row);
    });

    const overallPct = Math.round(((totalSum / totalQuestions) / 5.0) * 100);
    document.getElementById('rev-overall-score').textContent = `${overallPct}%`;
  }

  // Step 3 Submission
  btnSubmit.addEventListener('click', async () => {
    // Collect Feedback fields
    const strengths = document.getElementById('feedback-strengths').value;
    const improvement = document.getElementById('feedback-improvement').value;
    const theme = document.getElementById('feedback-theme').value;
    const confirmationCheckbox = document.getElementById('confirm-accuracy');

    // Validation
    if (!confirmationCheckbox.checked) {
      showAlert('Please confirm that you have reviewed your responses by checking the confirmation box.', 'danger', 'Confirmation Required');
      return;
    }

    // Verify all ratings are still intact (preventing bypass)
    const totalQuestions = questionnaireData.categories.reduce((acc, c) => acc + c.questions.length, 0);
    if (Object.keys(assessmentData.ratings).length < totalQuestions) {
      showAlert('Required answers are missing. Please complete all rating questions.', 'danger', 'Validation Error');
      goToStep(2);
      return;
    }

    // Collect tags selected
    const selectedTags = [];
    document.querySelectorAll('.theme-checkbox:checked').forEach(cb => {
      selectedTags.push(cb.value);
    });

    const payload = {
      department: assessmentData.department,
      experienceRange: assessmentData.experienceRange,
      ratings: assessmentData.ratings,
      strengthsFeedback: strengths,
      improvementFeedback: improvement,
      primaryTheme: theme,
      themeTags: selectedTags
    };

    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `Submitting...`;

    try {
      const response = await API.submitAssessment(payload);

      // Hide survey form, show success card
      surveyFormEl.style.display = 'none';
      successCardEl.classList.add('show');

      document.getElementById('success-id').textContent = response.assessmentId;
      document.getElementById('success-timestamp').textContent = new Date(response.timestamp).toLocaleString();
      document.getElementById('success-overall-score').textContent = `${response.overallScore}%`;

      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('Submission failed', err);
      showAlert(err.details && err.details.length ? err.details : err.message, 'danger', 'Submission Failed');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `Submit Assessment`;
    }
  });

  // Take Another Assessment Button
  document.getElementById('btn-reset-survey').addEventListener('click', () => {
    window.location.reload();
  });
});
