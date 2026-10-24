/**
 * WorkWise AI - Client API Service
 * Member 2 Assessment Module
 */

const API = {
  // Fetch questionnaire schema and metadata
  async getQuestionnaire() {
    const res = await fetch('/api/questions');
    if (!res.ok) throw new Error('Failed to load questionnaire schema');
    return await res.json();
  },

  // Fetch current authenticated user session (Member 1 Auth integration)
  async getCurrentUser() {
    try {
      const res = await fetch('/api/user');
      if (!res.ok) throw new Error('Failed to load user profile');
      return await res.json();
    } catch (e) {
      return {
        name: 'Employee',
        role: 'Team Member',
        department: 'Engineering'
      };
    }
  },

  // Submit assessment payload
  async submitAssessment(payload) {
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Submission failed');
      err.details = data.details || [];
      err.missingQuestions = data.missingQuestions || [];
      throw err;
    }
    return data;
  },

  // Fetch all completed assessments with optional department filter
  async getAssessments(department = 'All') {
    const query = department && department !== 'All' ? `?department=${encodeURIComponent(department)}` : '';
    const res = await fetch(`/api/assessments${query}`);
    if (!res.ok) throw new Error('Failed to load assessment history');
    return await res.json();
  },

  // Fetch specific assessment by unique ID
  async getAssessmentById(id) {
    const res = await fetch(`/api/assessments/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Assessment not found');
    return await res.json();
  },

  // Fetch anonymous feedback stream (Decoupled, no PII)
  async getAnonymousFeedback() {
    const res = await fetch('/api/anonymous-feedback');
    if (!res.ok) throw new Error('Failed to load anonymous feedback');
    return await res.json();
  }
};
