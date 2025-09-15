````markdown
# AI-Powered Excel Assessment Platform

This project is a comprehensive, three-stage assessment tool designed to evaluate a candidate's proficiency in Microsoft Excel. It moves beyond traditional testing by incorporating an interactive, AI-driven interview and a dynamic, scenario-based challenge.

 Live Project Documentation: (https://docs.google.com/document/d/1ie3A_hhcZam5bB3iYUZdihhYN9WIxhws6HKHs3dbDcU/edit?usp=sharing)

---

## Features

This application provides a complete, end-to-end assessment flow that mirrors a modern technical hiring process for roles requiring Excel skills.

### Multi-Round Assessment

The platform features three distinct rounds to test different aspects of a candidate's abilities:

- Round 1: Timed MCQ Test
  A multiple-choice quiz to assess foundational knowledge.

- Round 2: AI-Powered Verbal Interview
  An interactive session where an AI asks core questions and can generate dynamic follow-up questions based on the candidate's answers.

- Round 3: AI-Generated Scenario Challenge
  A practical, problem-solving round where the AI creates a unique business scenario for the candidate to address.

### Comprehensive Proctoring

To ensure the integrity of the assessment, the candidate's camera and microphone are active during all three rounds.

### AI-Powered Evaluation

The platform uses the Google Gemini model to evaluate verbal and written responses, providing scores and detailed, constructive feedback.

### Detailed Performance Report

At the end of the assessment, a comprehensive report is generated, breaking down the candidate's performance in each round and providing an overall proficiency analysis.

---

## Documentation

You can view the detailed design and project documentation here:  
AI-Powered Excel Assessment Platform Documentation:(https://docs.google.com/document/d/1ie3A_hhcZam5bB3iYUZdihhYN9WIxhws6HKHs3dbDcU/edit?usp=sharing)

---

## Local Setup and Installation

To run this application on your local machine, please follow these steps.

### Prerequisites

- Node.js (v14 or later)  
- npm (or yarn)  

### 1. Set Up Your Environment Variables

This project requires a Google Gemini API key to function correctly.  

- Create a file named `.env` in the root directory of the project.  
- Add your Gemini API key to this file as follows:


````

### 2. Install Dependencies

Open your terminal, navigate to the project's root directory, and run the following command:

```bash
npm install
```

### 3. Run the Application

Once the dependencies are installed, start the development server with:

```bash
npm start
```

This will launch the application, and you can access it in your web browser, typically at [http://localhost:3000](http://localhost:3000).

---
