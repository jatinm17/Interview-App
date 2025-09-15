import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Data Definitions ---
// Multiple choice questions for Round 1
const mcqQuestions = [
    { q: "Which symbol is used to make a cell reference absolute?", o: ["$", "!", "&", "#"], a: 0 },
    { q: "What function would you use to find the largest value in a range?", o: ["LARGE", "MAX", "HIGH", "TOP"], a: 1 },
    { q: "Which tool is best suited for summarizing large amounts of data with interactive tables?", o: ["Conditional Formatting", "Data Validation", "Charts", "Pivot Tables"], a: 3 },
    { q: "The function =SUMIFS() is used for:", o: ["Summing cells based on a single condition", "Summing cells based on multiple conditions", "Counting cells with numbers", "Finding the average"], a: 1 },
    { q: "What does the IFERROR function do?", o: ["Checks if a cell contains an error", "Returns a custom value if a formula evaluates to an error", "Highlights all errors in a sheet", "Counts the number of errors"], a: 1 },
    { q: "To create a chart in Excel, which tab would you go to?", o: ["Home", "Data", "Insert", "View"], a: 2 },
    { q: "What is the primary purpose of XLOOKUP?", o: ["To look up values vertically only", "To perform both vertical and horizontal lookups with more flexibility", "To create a dropdown list", "To calculate financial metrics"], a: 1 },
    { q: "The shortcut to edit a selected cell is:", o: ["F2", "F5", "F7", "F9"], a: 0 },
    { q: "What does the function =CONCATENATE() do?", o: ["Formats numbers as currency", "Joins several text strings into one string", "Converts text to uppercase", "Calculates the length of a string"], a: 1 },
    { q: "Which feature allows you to restrict the type of data that users can enter into a cell?", o: ["Flash Fill", "Data Validation", "Filters", "Slicers"], a: 1 },
    { q: "To remove duplicate values, you would use a tool located in which tab?", o: ["Home", "Insert", "Data", "Review"], a: 2 },
    { q: "The function =PROPER(\"hello world\") would return:", o: ["HELLO WORLD", "hello world", "Hello World", "HelloWorld"], a: 2 },
    { q: "A file extension for an Excel workbook is:", o: [".xlsx", ".docx", ".pptx", ".csv"], a: 0 },
    { q: "What does the Freeze Panes option allow you to do?", o: ["Lock a worksheet from editing", "Keep specific rows or columns visible while scrolling", "Prevent formulas from updating", "Hide a worksheet"], a: 1 },
    { q: "What does the function =VLOOKUP require the lookup value to be in?", o: ["Any column of the table array", "The first column of the table array", "The last column of the table array", "A separate worksheet"], a: 1 }
];

// Core interview questions for Round 2
const interviewQuestions = [
    { question: "To start, please briefly introduce yourself and your experience with Microsoft Excel.", type: "Introductory" },
    { question: "What is the difference between relative, absolute, and mixed cell references in Excel? Give an example of when you would use an absolute reference.", type: "Conceptual" },
    { question: "Explain the purpose of the IFERROR function. How can it be used to make your spreadsheets cleaner?", type: "Conceptual" },
    { question: "You have a column of dates and you want to find the total sales for a specific month, say 'January'. Which function would you use: SUMIF or SUMIFS, and why?", type: "Scenario" },
    { question: "Describe how you would use Data Validation to create a dropdown list in a cell.", type: "Procedural" },
    { question: "What are Pivot Tables and what are their primary advantages for data analysis?", type: "Conceptual" },
    { question: "Let's talk about lookups. What are the key advantages of using XLOOKUP over the older VLOOKUP or HLOOKUP functions?", type: "Comparison" },
    { question: "How would you remove duplicate rows from a dataset in Excel?", type: "Procedural" },
    { question: "Imagine you're given a messy dataset where a column of names is in all lowercase. What function would you use to convert them to Proper Case (e.g., 'john smith' to 'John Smith')?", type: "Formula Application" },
    { question: "What is the 'Flash Fill' feature and how can it help in data cleaning and preparation?", type: "Conceptual" },
    { question: "You have a list of employee salaries and you need to calculate a 5% bonus for everyone whose performance rating is 'Exceeds Expectations'. How would you write a single formula to do this?", type: "Formula Application" }
];

// API Configuration - Replace with your actual API key
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

// --- Main App Component ---
export default function App() {
    // Application state management for the entire user flow
    const [appState, setAppState] = useState('registration'); 
    const [userData, setUserData] = useState(null);
    const [mcqResults, setMcqResults] = useState(null);
    const [interviewFeedback, setInterviewFeedback] = useState([]);
    const [scenarioData, setScenarioData] = useState(null);
    const [scenarioFeedback, setScenarioFeedback] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // --- State Transition Logic ---
    const handleRegistration = (user) => { setUserData(user); setAppState('pre-interview'); };
    const startMcqRound = () => setAppState('mcq_round');
    const handleMcqCompletion = (results) => { setMcqResults(results); setAppState('transition_to_interview'); };
    const startInterviewRound = () => setAppState('interviewing');

    // Generate scenario based on interview performance and transition to scenario round
    const generateAndStartScenarioRound = async (finalInterviewFeedback) => {
        setInterviewFeedback(finalInterviewFeedback);
        setAppState('generating_scenario');
        setIsLoading(true);

        try {
            // Check if API key is configured
            if (!GEMINI_API_KEY) {
                console.error("Gemini API key not configured. Skipping scenario generation.");
                setAppState('finished');
                return;
            }

            // Find a suitable question to base the scenario on (preference for mid-range scores)
            const sourceQuestion = [...finalInterviewFeedback].reverse().find(fb => fb.score >= 3 && fb.score <= 4) || finalInterviewFeedback[finalInterviewFeedback.length - 1];
            
            if (!sourceQuestion) {
                setAppState('finished');
                return;
            }

            // System prompt for scenario generation
            const systemPrompt = `You are a senior data analyst creating a follow-up case study for a job interview. I will provide an Excel interview question and the candidate's answer. Your task is to create a brief, realistic business scenario that builds upon the original question. The scenario should be slightly more complex and require the candidate to explain their *approach* rather than just a single function. The output must be ONLY a JSON object with a single key: {"scenario": "Your generated scenario text here."}`;
            const userQuery = `Original Question: "${sourceQuestion.question}"\nCandidate's Answer: "${sourceQuestion.userAnswer}"`;
            
            // API payload for scenario generation
            const payload = { 
                contents: [{ parts: [{ text: userQuery }] }], 
                systemInstruction: { parts: [{ text: systemPrompt }] }, 
                generationConfig: { responseMimeType: "application/json" } 
            };

            const response = await fetch(GEMINI_API_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if (!response.ok) throw new Error("API Error");

            const result = await response.json();
            const scenarioJson = JSON.parse(result.candidates[0].content.parts[0].text);
            
            setScenarioData({
                scenario: scenarioJson.scenario,
                sourceQuestion: sourceQuestion.question
            });
            setAppState('transition_to_scenario');

        } catch (error) {
            console.error("Failed to generate scenario:", error);
            setAppState('finished');
        } finally {
            setIsLoading(false);
        }
    };
    
    const startScenarioRound = () => setAppState('scenario_round');

    // Handle scenario response evaluation
    const handleScenarioResponse = async (approachText) => {
        setIsLoading(true);
        try {
            if (approachText === "__SKIP__") {
                 setScenarioFeedback({
                    userApproach: "Question skipped (no response within the time limit).",
                    score: 0,
                    feedback: "The scenario question was skipped because no answer was submitted within the 5-minute time limit."
                });
            } else {
                // Check if API key is configured
                if (!GEMINI_API_KEY) {
                    setScenarioFeedback({
                        userApproach: approachText,
                        score: 0,
                        feedback: "API key not configured. Could not evaluate the response."
                    });
                } else {
                    // System prompt for scenario evaluation
                    const systemPrompt = `You are an AI hiring manager evaluating a candidate's problem-solving skills in Excel. I will provide a business scenario and the candidate's proposed approach. Evaluate the candidate's approach based on logic, efficiency, clarity, and mention of potential edge cases. Provide a score from 1-5 and constructive feedback. The output must be ONLY a valid JSON object with the following keys: {"score": number, "feedback": "Your detailed evaluation here."}`;
                    const userQuery = `Scenario: "${scenarioData.scenario}"\nCandidate's Approach: "${approachText}"`;

                    const payload = { 
                        contents: [{ parts: [{ text: userQuery }] }], 
                        systemInstruction: { parts: [{ text: systemPrompt }] }, 
                        generationConfig: { responseMimeType: "application/json" } 
                    };
                    
                    const response = await fetch(GEMINI_API_URL, { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify(payload) 
                    });
                    
                    if(!response.ok) throw new Error("API Error");
                    
                    const result = await response.json();
                    const evaluation = JSON.parse(result.candidates[0].content.parts[0].text);

                    setScenarioFeedback({
                        userApproach: approachText,
                        ...evaluation
                    });
                }
            }
        } catch (error) {
            console.error("Failed to evaluate scenario response:", error);
            setScenarioFeedback({
                userApproach: approachText,
                score: 0,
                feedback: "Could not evaluate the response due to a technical error."
            });
        } finally {
            setIsLoading(false);
            setAppState('finished');
        }
    };

    // Reset all state to restart the assessment
    const restartInterview = () => {
        setAppState('registration');
        setUserData(null);
        setMcqResults(null);
        setInterviewFeedback([]);
        setScenarioData(null);
        setScenarioFeedback(null);
    };

    // --- Main Render Logic ---
    return (
        <div className="bg-slate-100 font-sans flex items-center justify-center min-h-screen">
            <div className="w-full max-w-4xl h-[95vh] max-h-[800px] bg-white rounded-2xl shadow-2xl flex flex-col p-4 md:p-6">
                <Header />
                {/* Conditional rendering based on current app state */}
                {appState === 'registration' && <RegistrationScreen onRegister={handleRegistration} />}
                {appState === 'pre-interview' && <PreInterviewScreen onStart={startMcqRound} user={userData} />}
                {appState === 'mcq_round' && <MCQScreen questions={mcqQuestions} onComplete={handleMcqCompletion} />}
                {appState === 'transition_to_interview' && <TransitionScreen onComplete={startInterviewRound} title="Round 1 Complete!" subtitle="Get ready for the AI Interview round." />}
                {appState === 'interviewing' && <InterviewScreen key="interview" questions={interviewQuestions} onComplete={generateAndStartScenarioRound} user={userData} />}
                {appState === 'generating_scenario' && <LoadingScreen text="Analyzing your performance to generate a custom scenario..." />}
                {appState === 'transition_to_scenario' && <TransitionScreen onComplete={startScenarioRound} title="Round 2 Complete!" subtitle="Get ready for the final scenario-based round." />}
                {appState === 'scenario_round' && <ScenarioRoundScreen scenarioData={scenarioData} onSubmit={handleScenarioResponse} isLoading={isLoading} />}
                {appState === 'finished' && <FeedbackReport mcqResults={mcqResults} interviewFeedback={interviewFeedback} scenarioData={scenarioData} scenarioFeedback={scenarioFeedback} user={userData} onRestart={restartInterview} />}
            </div>
        </div>
    );
}

// --- UI Components ---

// Application header component
const Header = () => (
    <div className="flex-shrink-0 mb-4 pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">AI-Powered Excel Assessment</h1>
        <p className="text-sm text-slate-500">3-Step Assessment: MCQ, AI Interview & Scenario Challenge</p>
    </div>
);

// User registration screen
const RegistrationScreen = ({ onRegister }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); if (name && email) onRegister({ name, email }); };
    return (<div className="flex flex-col items-center justify-center h-full text-center p-6"><h2 className="text-xl font-semibold text-slate-700 mb-2">Candidate Registration</h2><p className="text-slate-600 mb-6 max-w-md">Please enter your details to begin.</p><form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4"><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full Name" required className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" required className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /><button type="submit" className="w-full px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform transform hover:scale-105">Proceed to System Check</button></form></div>);
};

// Camera feed component with error handling
const CameraFeed = React.memo(({ onReady, onError, small = false }) => {
    const videoRef = useRef(null);
    useEffect(() => {
        let stream;
        const enableMedia = async () => {
            try {
                // Request camera and microphone access
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (videoRef.current) videoRef.current.srcObject = stream;
                if (onReady) onReady();
            } catch (err) {
                console.error("Error accessing media devices.", err);
                if (onError) {
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') onError("Camera/mic access denied.");
                    else onError("Could not access camera/mic.");
                }
            }
        };
        enableMedia();
        // Cleanup function to stop media tracks
        return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
    }, [onReady, onError]);
    return <video ref={videoRef} autoPlay playsInline muted className={small ? "w-full h-full object-cover" : "w-full h-full"}></video>;
});

// Pre-interview system check screen
const PreInterviewScreen = ({ onStart, user }) => {
    const [mediaReady, setMediaReady] = useState(false);
    const [error, setError] = useState('');
    const handleReady = useCallback(() => setMediaReady(true), []);
    const handleError = useCallback((err) => setError(err), []);
    return (<div className="flex flex-col items-center justify-center h-full text-center p-6"><h2 className="text-xl font-semibold text-slate-700 mb-2">System Check</h2><p className="text-slate-600 mb-4">Welcome, {user.name}! Please enable your camera and microphone.</p><div className="w-full max-w-md bg-slate-200 rounded-lg overflow-hidden shadow-inner mb-4"><CameraFeed onReady={handleReady} onError={handleError} /></div>{error && <p className="text-red-500 text-sm mb-4">{error}</p>}<button onClick={onStart} disabled={!mediaReady} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all">{mediaReady ? 'Start Round 1: MCQ' : 'Waiting for Camera...'}</button></div>);
};

// Multiple choice questions screen with timer
const MCQScreen = ({ questions, onComplete }) => {
    const [answers, setAnswers] = useState(Array(questions.length).fill(null));
    const [timeLeft, setTimeLeft] = useState(8 * 60); // 8 minutes timer
    const timerRef = useRef(null);
    const handleCameraReady = useCallback(() => {}, []);
    const handleCameraError = useCallback(() => {}, []);

    // Handle MCQ submission and scoring
    const handleSubmit = useCallback(() => {
        if(timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        let score = 0;
        const detailedFeedback = questions.map((q, i) => {
            const isCorrect = answers[i] === q.a;
            if (isCorrect) score++;
            return { question: q.q, userAnswer: answers[i] !== null ? q.o[answers[i]] : "Not Answered", correctAnswer: q.o[q.a], isCorrect };
        });
        onComplete({ score, total: questions.length, detailedFeedback });
    }, [answers, questions, onComplete]);

    // Timer effect - auto-submit when time runs out
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => {if(timerRef.current) clearInterval(timerRef.current)};
    }, [handleSubmit]);

    const handleAnswerChange = (qIndex, ansIndex) => { setAnswers(prev => { const newAnswers = [...prev]; newAnswers[qIndex] = ansIndex; return newAnswers; }); };
    const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    return (<div className="flex flex-col h-full"><div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-slate-200"><h2 className="text-xl font-semibold text-slate-700">Round 1: Multiple Choice Questions</h2><div className={`text-xl font-bold px-3 py-1 rounded-md ${timeLeft < 60 ? 'text-red-600 bg-red-100' : 'text-slate-700 bg-slate-200'}`}>{formatTime(timeLeft)}</div></div><div className="flex flex-grow overflow-hidden"><div className="flex-grow overflow-y-auto p-4 space-y-6">{questions.map((q, qIndex) => (<div key={qIndex}><p className="font-semibold text-slate-800 mb-2">{qIndex + 1}. {q.q}</p><div className="space-y-1">{q.o.map((option, oIndex) => (<label key={oIndex} className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${answers[qIndex] === oIndex ? 'bg-blue-100 border-blue-400' : 'bg-slate-50 hover:bg-slate-100 border-transparent'} border`}><input type="radio" name={`q${qIndex}`} checked={answers[qIndex] === oIndex} onChange={() => handleAnswerChange(qIndex, oIndex)} className="mr-3" />{option}</label>))}</div></div>))}</div><div className="flex-shrink-0 w-1/4 p-4 border-l border-slate-200 flex flex-col items-center"><div className="w-full max-w-[200px] aspect-video bg-slate-200 rounded-lg overflow-hidden shadow-inner mb-4"><CameraFeed small onReady={handleCameraReady} onError={handleCameraError} /></div><div className="text-center p-2 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 text-xs"><p className="font-semibold">Proctoring Enabled</p><p>Your camera and microphone are active.</p></div></div></div><div className="flex-shrink-0 p-4 border-t border-slate-200 text-center"><button onClick={handleSubmit} className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Submit Answers</button></div></div>);
};

// Enhanced interview screen with cross-questioning capability
const InterviewScreen = ({ questions, onComplete, user }) => {
    const [messages, setMessages] = useState([]);
    const [feedbackData, setFeedbackData] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes timer
    
    // Track interview state for cross-questioning
    const [interviewState, setInterviewState] = useState({
        questionType: 'core', // 'core' or 'followup'
        awaitingFollowup: false,
        currentCoreQuestion: null,
        followupCount: 0, // Track number of follow-ups for current question
        totalQuestions: 0 // Track total questions asked including follow-ups
    });

    const onCompleteRef = useRef(onComplete);
    useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
    
    const feedbackDataRef = useRef(feedbackData);
    useEffect(() => { feedbackDataRef.current = feedbackData; }, [feedbackData]);

    // Handle interview completion
    const handleEndInterview = useCallback(() => {
        onCompleteRef.current(feedbackDataRef.current);
    }, []);

    // Initialize interview with first question and timer
    useEffect(() => {
        setMessages([ { sender: 'ai', text: questions[0].question } ]);
        setInterviewState(prev => ({ 
            ...prev, 
            currentCoreQuestion: questions[0],
            totalQuestions: 1
        }));
        
        const mainTimer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(mainTimer);
                    handleEndInterview();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        
        // Resume speech synthesis if paused (browser behavior)
        const speechResumeInterval = setInterval(() => {
            if ('speechSynthesis' in window && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }, 10000);

        return () => {
            clearInterval(mainTimer);
            clearInterval(speechResumeInterval);
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, [questions, handleEndInterview]);

    // Enhanced response handler with cross-questioning capability
    const handleUserResponse = useCallback(async (userText) => {
        setIsLoading(true);
        
        // Get current question context
        const currentQuestion = interviewState.questionType === 'core' 
            ? questions[currentQuestionIndex] 
            : interviewState.currentCoreQuestion;
        
        // Add user message to conversation
        setMessages(prev => [...prev, { sender: 'user', text: userText }]);

        // Function to process evaluation and determine next action
        const processAndAdvance = async (evaluation) => {
            // Store feedback for current response
            const feedbackEntry = { 
                question: interviewState.questionType === 'core' ? currentQuestion.question : `Follow-up to: ${interviewState.currentCoreQuestion.question}`,
                userAnswer: userText, 
                ...evaluation,
                questionType: interviewState.questionType,
                isFollowup: interviewState.questionType === 'followup'
            };
            
            setFeedbackData(prev => [...prev, feedbackEntry]);
            
            // Decide whether to ask follow-up question or move to next core question
            let shouldAskFollowup = false;
            
            // Only consider follow-ups for non-introductory questions
            if (currentQuestion.type !== 'Introductory' && interviewState.followupCount < 2) {
                // Ask follow-up if:
                // 1. This was a core question (not already a follow-up)
                // 2. Score is moderate (2-4) indicating room for deeper exploration
                // 3. We haven't exceeded follow-up limit
                // 4. We have time and questions remaining
                if (interviewState.questionType === 'core' && 
                    evaluation.score >= 2 && evaluation.score <= 4 &&
                    interviewState.totalQuestions < 15 && // Limit total questions
                    timeLeft > 60) { // Ensure enough time remains
                    shouldAskFollowup = true;
                }
            }

            try {
                if (shouldAskFollowup && !userText.includes("__SKIP__")) {
                    // Generate follow-up question using AI
                    await generateAndAskFollowup(currentQuestion, userText, evaluation);
                } else {
                    // Move to next core question or end interview
                    const nextIndex = currentQuestionIndex + 1;
                    if (nextIndex < questions.length) {
                        // Move to next core question
                        const aiResponse = evaluation.aiResponse || "Let's move to the next question.";
                        setMessages(prev => [...prev, 
                            { sender: 'ai', text: aiResponse }, 
                            { sender: 'ai', text: questions[nextIndex].question }
                        ]);
                        setCurrentQuestionIndex(nextIndex);
                        setInterviewState(prev => ({
                            ...prev,
                            questionType: 'core',
                            awaitingFollowup: false,
                            currentCoreQuestion: questions[nextIndex],
                            followupCount: 0,
                            totalQuestions: prev.totalQuestions + 1
                        }));
                    } else {
                        // End interview - no more core questions
                        onCompleteRef.current([...feedbackDataRef.current, feedbackEntry]);
                    }
                }
            } catch (error) {
                console.error("Error in processAndAdvance:", error);
                // Fallback: move to next question
                const nextIndex = currentQuestionIndex + 1;
                if (nextIndex < questions.length) {
                    setMessages(prev => [...prev, 
                        { sender: 'ai', text: "Let's continue." }, 
                        { sender: 'ai', text: questions[nextIndex].question }
                    ]);
                    setCurrentQuestionIndex(nextIndex);
                    setInterviewState(prev => ({
                        ...prev,
                        questionType: 'core',
                        awaitingFollowup: false,
                        currentCoreQuestion: questions[nextIndex],
                        followupCount: 0,
                        totalQuestions: prev.totalQuestions + 1
                    }));
                } else {
                    onCompleteRef.current([...feedbackDataRef.current, feedbackEntry]);
                }
            }
            
            setIsLoading(false);
        };

        // Generate and ask a follow-up question based on the user's response
        const generateAndAskFollowup = async (originalQuestion, userAnswer, evaluation) => {
            try {
                // Check if API is configured
                if (!GEMINI_API_KEY) {
                    // Fallback: move to next question without follow-up
                    const nextIndex = currentQuestionIndex + 1;
                    if (nextIndex < questions.length) {
                        setMessages(prev => [...prev, 
                            { sender: 'ai', text: evaluation.aiResponse || "Thank you. Let's continue." }, 
                            { sender: 'ai', text: questions[nextIndex].question }
                        ]);
                        setCurrentQuestionIndex(nextIndex);
                        setInterviewState(prev => ({
                            ...prev,
                            questionType: 'core',
                            currentCoreQuestion: questions[nextIndex],
                            followupCount: 0,
                            totalQuestions: prev.totalQuestions + 1
                        }));
                    } else {
                        onCompleteRef.current([...feedbackDataRef.current, { 
                            question: originalQuestion.question, 
                            userAnswer, 
                            ...evaluation 
                        }]);
                    }
                    return;
                }

                // Generate follow-up question using AI
                const followupPrompt = `You are an expert Excel interviewer conducting a follow-up question. Based on the candidate's answer to the original question, generate ONE specific, probing follow-up question that digs deeper into their understanding. The follow-up should be practical and test their knowledge further. Be conversational and natural.

Original Question: "${originalQuestion.question}"
Candidate's Answer: "${userAnswer}"
Evaluation Score: ${evaluation.score}/5

Generate a follow-up question that explores their understanding more deeply. Return ONLY a JSON object: {"followupQuestion": "Your follow-up question here"}`;

                const payload = {
                    contents: [{ parts: [{ text: followupPrompt }] }],
                    systemInstruction: { parts: [{ text: "You are an expert Excel interviewer. Generate thoughtful follow-up questions." }] },
                    generationConfig: { responseMimeType: "application/json" }
                };

                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("API Error");

                const result = await response.json();
                const followupData = JSON.parse(result.candidates[0].content.parts[0].text);

                // Add AI response and follow-up question to conversation
                setMessages(prev => [...prev,
                    { sender: 'ai', text: evaluation.aiResponse || "I see." },
                    { sender: 'ai', text: followupData.followupQuestion }
                ]);

                // Update interview state for follow-up mode
                setInterviewState(prev => ({
                    ...prev,
                    questionType: 'followup',
                    awaitingFollowup: false,
                    followupCount: prev.followupCount + 1,
                    totalQuestions: prev.totalQuestions + 1
                }));

            } catch (error) {
                console.error("Error generating follow-up:", error);
                // Fallback: continue to next core question
                const nextIndex = currentQuestionIndex + 1;
                if (nextIndex < questions.length) {
                    setMessages(prev => [...prev,
                        { sender: 'ai', text: evaluation.aiResponse || "Let's move on." },
                        { sender: 'ai', text: questions[nextIndex].question }
                    ]);
                    setCurrentQuestionIndex(nextIndex);
                    setInterviewState(prev => ({
                        ...prev,
                        questionType: 'core',
                        currentCoreQuestion: questions[nextIndex],
                        followupCount: 0,
                        totalQuestions: prev.totalQuestions + 1
                    }));
                } else {
                    onCompleteRef.current([...feedbackDataRef.current, { 
                        question: originalQuestion.question, 
                        userAnswer, 
                        ...evaluation 
                    }]);
                }
            }
        };

        // Handle skipped questions
        if (userText === "__SKIP__") {
            processAndAdvance({
                score: 0, 
                isCorrect: false, 
                aiResponse: "Let's move to the next question.", 
                detailedFeedback: "Question was skipped."
            });
            return;
        }

        // Handle introductory questions (not scored)
        if (currentQuestion.type === 'Introductory') {
             processAndAdvance({
                 score: 0, 
                 isCorrect: true, 
                 aiResponse: "Thank you. Let's start with the technical questions.", 
                 detailedFeedback: "Introductory question, not scored."
             });
             return;
        }

        try {
            // Check if API key is configured for evaluation
            if (!GEMINI_API_KEY) {
                // Provide mock evaluation when API is not configured
                const mockEvaluation = {
                    score: Math.floor(Math.random() * 3) + 2, // Random score 2-4
                    isCorrect: Math.random() > 0.5,
                    aiResponse: "Thank you for your response. Let's continue.",
                    detailedFeedback: "API key not configured. This is a mock evaluation."
                };
                processAndAdvance(mockEvaluation);
                return;
            }

            // System prompt for answer evaluation
            const systemPrompt = `You are an expert AI interviewer for Microsoft Excel skills. Your task is to evaluate a candidate's answer to a specific Excel question. Analyze the candidate's answer for correctness, clarity, and completeness. Return your evaluation in a valid JSON object with these exact keys: { "isCorrect": boolean, "score": number (1-5), "aiResponse": "A brief, one-sentence, encouraging conversational response.", "detailedFeedback": "A concise paragraph of constructive feedback." }`;
            const userQuery = `Question: "${currentQuestion.question}"\nCandidate's Answer: "${userText}"`;
            
            // API payload for answer evaluation
            const payload = { 
                contents: [{ parts: [{ text: userQuery }] }], 
                systemInstruction: { parts: [{ text: systemPrompt }] }, 
                generationConfig: { responseMimeType: "application/json" } 
            };
            
            const response = await fetch(GEMINI_API_URL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
            
            if (!response.ok) throw new Error(`API Error`);
            const result = await response.json();
            const evaluation = JSON.parse(result.candidates[0].content.parts[0].text);
            processAndAdvance(evaluation);
        } catch (error) {
            console.error("Error evaluating answer:", error);
            // Provide error fallback evaluation
            const errorEval = {
                score: 0, 
                isCorrect: false, 
                aiResponse: "There was an issue, let's move on.", 
                detailedFeedback: "Could not evaluate due to a technical error."
            };
            processAndAdvance(errorEval);
        }
    }, [currentQuestionIndex, questions, interviewState, timeLeft]);
    
    const handleCameraReady = useCallback(() => {}, []);
    const handleCameraError = useCallback(() => {}, []);
    const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    return (
        <div className="flex h-full overflow-hidden relative">
            {/* Header with timer, stop button, and camera feed */}
            <div className="absolute top-2 right-2 flex items-center gap-4 z-10">
                <div className="text-xs bg-slate-100 px-2 py-1 rounded-md">
                    <span className="font-medium">Questions:</span> {interviewState.totalQuestions}
                    {interviewState.questionType === 'followup' && <span className="text-blue-600 ml-1">(Follow-up)</span>}
                </div>
                <div className={`text-lg font-bold px-3 py-1 rounded-md ${timeLeft < 60 ? 'text-red-600 bg-red-100' : 'text-slate-700 bg-slate-200'}`}>{formatTime(timeLeft)}</div>
                <button onClick={handleEndInterview} className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-red-700">Stop Test</button>
                <div className="w-40 h-30 rounded-lg shadow-md overflow-hidden bg-slate-200"><CameraFeed small onReady={handleCameraReady} onError={handleCameraError}/></div>
            </div>
             <div className="flex flex-col h-full overflow-hidden flex-grow pt-16">
                 <MessageList messages={messages} isLoading={isLoading} user={user} questions={questions} />
                 <div className="flex-shrink-0 p-4 border-t border-slate-200">
                    <AnswerBox key={`${currentQuestionIndex}-${interviewState.questionType}-${interviewState.followupCount}`} onSend={handleUserResponse} isLoading={isLoading} showSkipButton={true} />
                 </div>
             </div>
        </div>
    );
};

// Message list component with speech synthesis
const MessageList = ({ messages, isLoading, user, questions }) => {
    const messagesEndRef = useRef(null);
    const speechQueueRef = useRef([]);
    const isSpeakingRef = useRef(false);
    const lastSpokenMessageIndexRef = useRef(-1);

    // Process speech queue for text-to-speech
    const processSpeechQueue = useCallback(() => {
        if (isSpeakingRef.current || speechQueueRef.current.length === 0 || !('speechSynthesis' in window)) {
            return;
        }

        isSpeakingRef.current = true;
        const textToSpeak = speechQueueRef.current.shift();

        if (typeof textToSpeak !== 'string' || textToSpeak.trim() === '') {
            isSpeakingRef.current = false;
            setTimeout(processSpeechQueue, 100);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = 0.95;
        
        utterance.onend = () => {
            isSpeakingRef.current = false;
            setTimeout(processSpeechQueue, 100);
        };
        
        utterance.onerror = (e) => {
             if (e.error === 'interrupted') {
                console.warn("Speech interrupted, continuing queue.");
            } else {
                console.error("Speech synthesis error:", e.error);
            }
            isSpeakingRef.current = false;
             if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            setTimeout(processSpeechQueue, 100);
        };
        
        window.speechSynthesis.speak(utterance);
    }, []);
    
    // Handle speech for new AI messages
    useEffect(() => {
        const lastMessageIndex = messages.length - 1;
        if (lastMessageIndex > lastSpokenMessageIndexRef.current) {
            const lastMessage = messages[lastMessageIndex];
            if (lastMessage && lastMessage.sender === 'ai') {
                lastSpokenMessageIndexRef.current = lastMessageIndex;
                const isQuestion = questions.some(q => q.question === lastMessage.text);
                let finalText = lastMessage.text;
                if (isQuestion && user?.name && lastMessage.text !== questions[0].question) {
                    finalText = `${user.name}, ${lastMessage.text}`;
                }
                speechQueueRef.current.push(finalText);
                if (!isSpeakingRef.current) {
                    processSpeechQueue();
                }
            }
        }
    }, [messages, user, questions, processSpeechQueue]);

    // Auto-scroll to latest message
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    return (
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
             {messages.map((msg, index) => (
                 <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                     {msg.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">AI</div>}
                     <div className={`max-w-xl px-4 py-2 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none'}`}>
                         <p className="whitespace-pre-wrap">{msg.text}</p>
                     </div>
                 </div>
             ))}
             {/* Loading indicator */}
             {isLoading && (<div className="flex items-end gap-2 justify-start"><div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">AI</div><div className="px-4 py-3 rounded-2xl bg-slate-200 rounded-bl-none"><div className="flex items-center gap-2"><span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></span><span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></span></div></div></div>)}
            <div ref={messagesEndRef} />
        </div>
    )
}

// Answer input component with speech recognition and timer
const AnswerBox = ({ onSend, isLoading, showSkipButton = false }) => {
    const [inputText, setInputText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordTimer, setRecordTimer] = useState(30);
    const [timeToStart, setTimeToStart] = useState(15);
    const [answerState, setAnswerState] = useState('ready_to_record');
    
    const recognitionRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const startTimerRef = useRef(null);
    const hasTimedOut = useRef(false);

    const onSendRef = useRef(onSend);
    useEffect(() => { onSendRef.current = onSend; }, [onSend]);
    const stopRecording = useCallback(() => {
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        setAnswerState('reviewing');
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }, [isRecording]);
    
    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true; 
            recognition.interimResults = true;
    
            recognition.onresult = (event) => { 
                let finalTranscript = ''; 
                for (let i = event.resultIndex; i < event.results.length; ++i) 
                    if (event.results[i].isFinal) 
                        finalTranscript += event.results[i][0].transcript; 
                if(finalTranscript) 
                    setInputText(prev => prev.trim() ? `${prev.trim()} ${finalTranscript}` : finalTranscript); 
            };
    
            recognition.onerror = (event) => {
                if (event.error !== 'no-speech') console.error("Speech recognition error", event.error);
            };
    
            recognition.onend = () => stopRecording(); 
            recognitionRef.current = recognition;
        } else console.warn("Speech Recognition not supported.");
    
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (startTimerRef.current) clearInterval(startTimerRef.current);
        };
    }, [stopRecording]); // ✅ include stopRecording as dependency
    

    // Auto-skip timer for questions
    useEffect(() => {
        if (isLoading) {
            if (startTimerRef.current) clearInterval(startTimerRef.current);
            return;
        }
        
        if (answerState === 'ready_to_record') {
            hasTimedOut.current = false;
            setTimeToStart(15);
            startTimerRef.current = setInterval(() => {
                setTimeToStart(prev => {
                    if (prev <= 1) {
                        clearInterval(startTimerRef.current);
                        if (!hasTimedOut.current) {
                           hasTimedOut.current = true;
                           onSendRef.current("__SKIP__");
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(startTimerRef.current);
    }, [isLoading, answerState]);

    // Start voice recording
    const startRecording = () => {
        if (!recognitionRef.current || isLoading) return;
        if(startTimerRef.current) clearInterval(startTimerRef.current);
        setInputText(''); 
        setIsRecording(true); 
        setAnswerState('recording'); 
        recognitionRef.current.start();
        setRecordTimer(30);
        timerIntervalRef.current = setInterval(() => setRecordTimer(prev => { 
            if (prev <= 1) { 
                clearInterval(timerIntervalRef.current); 
                stopRecording(); 
                return 0; 
            } 
            return prev - 1; 
        }), 1000);
    };



    // Handle question skip
    const handleSkip = () => {
        if(startTimerRef.current) clearInterval(startTimerRef.current);
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        onSend("__SKIP__");
    }

    // Submit answer
    const handleSend = () => { 
        if (inputText.trim() && !isLoading) { 
            onSend(inputText); 
            setInputText(''); 
            setAnswerState('ready_to_record'); 
        } 
    };
    
    // Render different states of answer box
    switch (answerState) {
        case 'recording': 
            return (
                <div className="flex items-center justify-center gap-4 p-4 bg-slate-100 rounded-lg">
                    <div className="relative w-20 h-20">
                        <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path className="text-slate-300" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4"></path>
                            <path className="text-red-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4" strokeDasharray={`${(recordTimer / 30) * 100}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)"></path>
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-700">{recordTimer}</span>
                    </div>
                    <button onClick={stopRecording} className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700">Stop Recording</button>
                </div>
            );
        case 'reviewing': 
            return (
                <div className="flex items-end gap-2">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Review your transcribed answer..." rows="3" className="flex-grow p-3 bg-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    <button onClick={handleSend} disabled={isLoading} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400">Submit</button>
                </div>
            );
        default: 
            return (
                <div className="text-center p-4 flex justify-center items-center gap-4">
                     {showSkipButton && (
                        <button onClick={handleSkip} disabled={isLoading} className="px-6 py-3 bg-slate-200 text-slate-700 font-semibold rounded-lg shadow-sm hover:bg-slate-300 disabled:bg-slate-100 transition-colors">
                            Skip Question
                        </button>
                    )}
                    <button onClick={startRecording} disabled={isLoading} className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 disabled:bg-slate-400 transition-transform transform hover:scale-105 flex items-center gap-3 mx-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                        Record Answer ({timeToStart}s)
                    </button>
                </div>
            );
    }
};

// Scenario round component
const ScenarioRoundScreen = ({ scenarioData, onSubmit, isLoading }) => {
    const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes
    const [approachText, setApproachText] = useState('');
    const onSubmitRef = useRef(onSubmit);
    useEffect(() => { onSubmitRef.current = onSubmit; }, [onSubmit]);

    // Timer for scenario round
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onSubmitRef.current('__SKIP__');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = () => {
        if(approachText.trim() && !isLoading) {
            onSubmitRef.current(approachText);
        }
    };

    const handleCameraReady = useCallback(() => {}, []);
    const handleCameraError = useCallback(() => {}, []);
    const formatTime = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    return(
        <div className="flex flex-col h-full relative">
            {/* Header with timer and camera */}
            <div className="absolute top-2 right-2 z-10 flex items-center gap-4">
                 <div className={`text-lg font-bold px-3 py-1 rounded-md ${timeLeft < 60 ? 'text-red-600 bg-red-100' : 'text-slate-700 bg-slate-200'}`}>{formatTime(timeLeft)}</div>
                 <div className="w-40 h-30 rounded-lg shadow-md overflow-hidden bg-slate-200"><CameraFeed small onReady={handleCameraReady} onError={handleCameraError}/></div>
            </div>
            <div className="flex-shrink-0 p-4 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-700">Round 3: Scenario Challenge</h2>
                <p className="text-sm text-slate-500">Based on your answer to: "{scenarioData.sourceQuestion}"</p>
            </div>
            <div className="flex-grow overflow-y-auto p-4 space-y-4 flex flex-col">
                <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Generated Scenario:</h3>
                    <p className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">{scenarioData.scenario}</p>
                </div>
                <div className="flex-grow flex flex-col">
                    <h3 className="font-semibold text-slate-800 mb-2">Your Proposed Approach:</h3>
                    <textarea 
                        value={approachText} 
                        onChange={(e) => setApproachText(e.target.value)}
                        placeholder="Outline your step-by-step approach here..." 
                        className="w-full flex-grow p-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                        disabled={isLoading}
                    />
                </div>
            </div>
            <div className="flex-shrink-0 p-4 border-t border-slate-200 text-center">
                 <button 
                    onClick={handleSubmit} 
                    disabled={isLoading || !approachText.trim()} 
                    className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Evaluating...' : 'Submit Final Answer'}
                </button>
            </div>
        </div>
    );
};

// Loading screen component
const LoadingScreen = ({ text }) => (<div className="flex flex-col items-center justify-center h-full text-center p-6"><svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><p className="text-slate-600">{text}</p></div>);

// Transition screen with countdown
const TransitionScreen = ({ onComplete, title, subtitle }) => {
    const [timeLeft, setTimeLeft] = useState(15);
    useEffect(() => { 
        if (timeLeft === 0) { 
            onComplete(); 
            return; 
        } 
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000); 
        return () => clearTimeout(timer); 
    }, [timeLeft, onComplete]);
    
    return (<div className="flex flex-col items-center justify-center h-full text-center p-6"><h2 className="text-xl font-semibold text-slate-700 mb-2">{title}</h2><p className="text-slate-600 mb-6">{subtitle}</p><div className="relative w-32 h-32"><svg className="w-full h-full" viewBox="0 0 36 36"><path className="text-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4"></path><path className="text-blue-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" strokeWidth="4" strokeDasharray={`${(timeLeft / 15) * 100}, 100`} strokeLinecap="round" transform="rotate(-90 18 18)"></path></svg><span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-slate-700">{timeLeft}</span></div><p className="text-slate-500 mt-4">Starting next round...</p></div>);
};

// Final feedback report component
const FeedbackReport = ({ mcqResults, interviewFeedback, scenarioData, scenarioFeedback, user, onRestart }) => {
    // Calculate interview scores (excluding introductory and follow-up questions from average)
    const coreInterviewResponses = interviewFeedback.filter(item => item.type !== 'Introductory' && !item.isFollowup);
    const interviewTotalScore = coreInterviewResponses.reduce((sum, item) => sum + item.score, 0);
    const scoredQuestionsCount = coreInterviewResponses.length;
    const interviewAverageScore = scoredQuestionsCount > 0 ? (interviewTotalScore / scoredQuestionsCount).toFixed(1) : 0;
    
    // Determine proficiency level based on average score
    const getProficiency = (avg) => { 
        if (avg >= 4.5) return "Expert"; 
        if (avg >= 3.5) return "Proficient"; 
        if (avg >= 2.5) return "Intermediate"; 
        return "Novice"; 
    };
    const proficiency = getProficiency(interviewAverageScore);
    
    // Separate core questions from follow-ups for display
    const coreQuestions = interviewFeedback.filter(item => !item.isFollowup);
    const followupQuestions = interviewFeedback.filter(item => item.isFollowup);
    
    return (
        <div className="flex flex-col h-full">
            <div className="overflow-y-auto p-1 pr-4">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Overall Performance Report</h2>
                <p className="text-sm text-slate-600 mb-6">Candidate: {user.name} ({user.email})</p>
                
                {/* MCQ Section */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3 pb-2 border-b-2 border-blue-500">Round 1: MCQ Results</h3>
                    <div className="bg-slate-100 p-4 rounded-lg text-center">
                        <p className="text-sm text-slate-600">Score</p>
                        <p className="text-4xl font-bold text-blue-600">{mcqResults?.score} / {mcqResults?.total}</p>
                        <p className="text-sm text-slate-500 mt-1">{((mcqResults?.score / mcqResults?.total) * 100).toFixed(0)}% Correct</p>
                    </div>
                </div>
                
                {/* Interview Section */}
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-700 mb-3 pb-2 border-b-2 border-blue-500">Round 2: AI Interview Results</h3>
                    <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-lg mb-4">
                        <div>
                            <p className="text-sm text-slate-600">Core Questions Score</p>
                            <p className="text-3xl font-bold text-blue-600">{interviewAverageScore} / 5.0</p>
                        </div>
                        <div className="w-px h-12 bg-slate-300"></div>
                        <div>
                            <p className="text-sm text-slate-600">Proficiency</p>
                            <p className="text-3xl font-bold text-blue-600">{proficiency}</p>
                        </div>
                        <div className="w-px h-12 bg-slate-300"></div>
                        <div>
                            <p className="text-sm text-slate-600">Total Questions</p>
                            <p className="text-3xl font-bold text-blue-600">{interviewFeedback.length}</p>
                            <p className="text-xs text-slate-500">{followupQuestions.length} follow-ups</p>
                        </div>
                    </div>
                    
                    {/* Core Questions */}
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        <h4 className="font-semibold text-slate-600">Core Questions:</h4>
                        {coreQuestions.map((item, index) => (
                            <div key={index} className={`border rounded-lg p-3 ${item.userAnswer.includes('skipped') ? 'bg-amber-50' : ''}`}>
                                <p className="font-semibold text-slate-700 text-sm mb-1">{item.question}</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.score > 3 ? 'bg-green-100 text-green-800' : item.score >= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                        Score: {item.score}/5
                                    </span>
                                    {item.type && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">{item.type}</span>}
                                </div>
                                <p className="text-xs text-slate-800 mb-1"><span className="font-semibold">Answer:</span> {item.userAnswer.slice(0, 100)}{item.userAnswer.length > 100 ? '...' : ''}</p>
                                <p className="text-xs text-slate-600"><span className="font-semibold">Feedback:</span> {item.detailedFeedback}</p>
                            </div>
                        ))}
                        
                        {/* Follow-up Questions */}
                        {followupQuestions.length > 0 && (
                            <>
                                <h4 className="font-semibold text-slate-600 mt-4">AI Follow-up Questions:</h4>
                                {followupQuestions.map((item, index) => (
                                    <div key={`followup-${index}`} className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                                        <p className="font-semibold text-slate-700 text-sm mb-1">{item.question}</p>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.score > 3 ? 'bg-green-100 text-green-800' : item.score >= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                                Score: {item.score}/5
                                            </span>
                                            <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">Follow-up</span>
                                        </div>
                                        <p className="text-xs text-slate-800 mb-1"><span className="font-semibold">Answer:</span> {item.userAnswer.slice(0, 100)}{item.userAnswer.length > 100 ? '...' : ''}</p>
                                        <p className="text-xs text-slate-600"><span className="font-semibold">Feedback:</span> {item.detailedFeedback}</p>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
                
                {/* Scenario Section */}
                {scenarioData && scenarioFeedback && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-700 mb-3 pb-2 border-b-2 border-blue-500">Round 3: Scenario Challenge</h3>
                        <div className="bg-slate-100 p-4 rounded-lg mb-4">
                            <div>
                                <p className="text-sm text-slate-600">Scenario Score</p>
                                <p className="text-3xl font-bold text-blue-600">{scenarioFeedback.score} / 5.0</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Scenario Presented:</p>
                                <p className="text-sm p-2 bg-slate-50 border rounded-md">{scenarioData.scenario}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Your Approach:</p>
                                <p className="text-sm p-2 bg-slate-50 border rounded-md">{scenarioFeedback.userApproach}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Evaluation:</p>
                                <p className="text-sm p-2 bg-white border rounded-md">{scenarioFeedback.feedback}</p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Overall Assessment Summary */}
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-slate-700 mb-2">Assessment Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm font-medium text-slate-600">MCQ Performance</p>
                            <p className="text-lg font-bold text-blue-600">{((mcqResults?.score / mcqResults?.total) * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-600">Interview Performance</p>
                            <p className="text-lg font-bold text-blue-600">{proficiency}</p>
                        </div>
                        {scenarioFeedback && (
                            <div>
                                <p className="text-sm font-medium text-slate-600">Scenario Performance</p>
                                <p className="text-lg font-bold text-blue-600">{scenarioFeedback.score}/5</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Key Insights */}
                    <div className="mt-4 text-sm text-slate-700">
                        <p className="font-medium mb-1">Key Insights:</p>
                        <ul className="text-xs space-y-1 pl-4">
                            <li>• Completed {interviewFeedback.length} total questions ({coreQuestions.length} core + {followupQuestions.length} follow-ups)</li>
                            <li>• AI follow-up questions were generated based on your responses to explore deeper understanding</li>
                            <li>• {proficiency} level indicates your current Excel proficiency based on core question performance</li>
                            {scenarioFeedback && <li>• Scenario challenge tested practical application of your Excel knowledge</li>}
                        </ul>
                    </div>
                </div>
            </div>
            
            {/* Restart Button */}
            <div className="flex-shrink-0 pt-4 mt-auto text-center">
                <button onClick={onRestart} className="px-6 py-2 bg-slate-600 text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition-colors">
                    Take Assessment Again
                </button>
            </div>
        </div>
    );
};
