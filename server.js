const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Generate question endpoint
app.post('/api/generate-question', async (req, res) => {
    try {
        const { type } = req.body;

        if (!process.env.GROQ_API_KEY) {
            console.error('❌ GROQ_API_KEY is not set in .env file!');
            return res.status(500).json({
                error: 'API key not configured. Please check your .env file.',
                useFallback: true
            });
        }

        // Log API key status (first/last 4 chars only for security)
        const keyPreview = process.env.GROQ_API_KEY.slice(0, 4) + '...' + process.env.GROQ_API_KEY.slice(-4);
        console.log(`🔑 Using Groq API key: ${keyPreview}`);

        let prompt = '';
        switch (type) {
            case 'technical':
                const techTopics = [
                    'data structures and algorithms',
                    'system design and scalability',
                    'database optimization',
                    'API design principles',
                    'debugging and troubleshooting',
                    'code optimization',
                    'security best practices',
                    'testing strategies',
                    'microservices architecture',
                    'cloud computing concepts',
                    'concurrency and multithreading',
                    'object-oriented design patterns'
                ];
                const randomTechTopic = techTopics[Math.floor(Math.random() * techTopics.length)];
                prompt = `Generate a unique technical interview question about: ${randomTechTopic}. 
                Return strictly in this JSON format (no markdown, just raw JSON):
                {
                    "question": "A challenging technical question about ${randomTechTopic}",
                    "context": "Technical context explaining what skills this tests",
                    "tips": [
                        "Technical approach tip",
                        "Implementation consideration",
                        "Best practice suggestion"
                    ]
                }`;
                break;

            case 'behavioral':
                const behavioralTopics = [
                    'handling a difficult team member',
                    'meeting a tight deadline',
                    'dealing with failure',
                    'resolving a conflict',
                    'taking initiative',
                    'dealing with ambiguity',
                    'receiving negative feedback',
                    'persuading someone',
                    'working under pressure',
                    'making a difficult decision',
                    'going above and beyond',
                    'learning from a mistake'
                ];
                const randomBehavioralTopic = behavioralTopics[Math.floor(Math.random() * behavioralTopics.length)];
                prompt = `Generate a unique behavioral interview question about: ${randomBehavioralTopic}.
                Return strictly in this JSON format (no markdown, just raw JSON):
                {
                    "question": "A situation-based behavioral question about ${randomBehavioralTopic}",
                    "context": "What this reveals about the candidate's soft skills",
                    "tips": [
                        "STAR method application tip",
                        "Key points to include",
                        "Communication strategy"
                    ]
                }`;
                break;

            case 'hr':
                const hrTopics = [
                    'salary expectations and compensation negotiation',
                    'work-life balance preferences',
                    'why you want to leave your current job',
                    'your greatest professional achievement',
                    'how you handle workplace conflicts',
                    'your 5-year career goals',
                    'what motivates you at work',
                    'your ideal work environment',
                    'how you handle criticism',
                    'why you want to work at this company',
                    'your leadership style',
                    'how you prioritize tasks',
                    'your biggest professional failure and lessons learned'
                ];
                const randomHrTopic = hrTopics[Math.floor(Math.random() * hrTopics.length)];
                prompt = `Generate a unique HR interview question specifically about: ${randomHrTopic}.
                Make sure the question is different and creative. Do NOT ask about adapting to change.
                Return strictly in this JSON format (no markdown, just raw JSON):
                {
                    "question": "An HR/cultural fit question about ${randomHrTopic}",
                    "context": "What this reveals about candidate's alignment with company",
                    "tips": [
                        "Company research tip",
                        "Professional goal alignment",
                        "Cultural value demonstration"
                    ]
                }`;
                break;

            default:
                prompt = `Generate a general interview question suitable for any role.
                Return strictly in this JSON format (no markdown, just raw JSON):
                {
                    "question": "A professional interview question",
                    "context": "Purpose of this question in evaluating candidates",
                    "tips": [
                        "Structure suggestion",
                        "Key elements to include",
                        "Professional presentation tip"
                    ]
                }`;
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an interview question generator. Always respond with valid JSON only, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`❌ Groq API Error: Status ${response.status}`);
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const questionData = JSON.parse(content);
        res.json(questionData);

    } catch (error) {
        console.error('Error generating question:', error);
        res.status(500).json({
            error: error.message,
            useFallback: true
        });
    }
});

// Generate feedback endpoint
app.post('/api/generate-feedback', async (req, res) => {
    try {
        const { question, answer, type } = req.body;

        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                error: 'API key not configured',
                useFallback: true
            });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an interview feedback evaluator. Always respond with valid JSON only, no markdown formatting.'
                    },
                    {
                        role: 'user',
                        content: `Evaluate this ${type} interview answer. Question: "${question}" Answer: "${answer}"
                        Respond strictly in this JSON format (no markdown, just raw JSON):
                        {
                            "feedback": "brief constructive feedback",
                            "score": 7,
                            "strengths": ["key strength 1", "key strength 2"],
                            "improvements": ["improvement 1", "improvement 2"]
                        }`
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        const feedbackData = JSON.parse(content);
        res.json(feedbackData);

    } catch (error) {
        console.error('Error generating feedback:', error);
        res.status(500).json({
            error: error.message,
            useFallback: true
        });
    }
});

// D-ID Talk endpoint - Generate talking avatar video
app.post('/api/did-talk', async (req, res) => {
    try {
        const { text, voiceId } = req.body;

        if (!process.env.D_ID_API_KEY) {
            console.error('❌ D_ID_API_KEY is not set in .env file!');
            return res.status(500).json({
                error: 'D-ID API key not configured',
                useStaticAvatar: true
            });
        }

        console.log('🎬 Creating D-ID talking video...');

        // Encode API key for Basic auth
        const apiKey = process.env.D_ID_API_KEY;

        // Create a talk video using D-ID's free presenter
        const createResponse = await fetch('https://api.d-id.com/talks', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${apiKey}`,
                'Content-Type': 'application/json',
                'accept': 'application/json'
            },
            body: JSON.stringify({
                script: {
                    type: 'text',
                    input: text.substring(0, 300), // Keep it short for free tier
                    provider: {
                        type: 'microsoft',
                        voice_id: voiceId || 'en-US-JennyNeural'
                    }
                },
                // Using a public image that works with D-ID
                source_url: 'https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg',
                config: {
                    fluent: true,
                    pad_audio: 0
                }
            })
        });

        const createData = await createResponse.json();
        console.log('D-ID Response:', createResponse.status, JSON.stringify(createData));

        if (!createResponse.ok) {
            console.error('D-ID create error:', createData);
            throw new Error(`D-ID API error: ${createResponse.status} - ${createData.description || createData.message || 'Unknown error'}`);
        }

        const talkId = createData.id;

        console.log(`🎬 D-ID talk created: ${talkId}, polling for result...`);

        // Poll for the result
        let result = null;
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));

            const statusResponse = await fetch(`https://api.d-id.com/talks/${talkId}`, {
                headers: {
                    'Authorization': `Basic ${process.env.D_ID_API_KEY}`
                }
            });

            const statusData = await statusResponse.json();

            if (statusData.status === 'done') {
                result = statusData;
                break;
            } else if (statusData.status === 'error') {
                throw new Error('D-ID video generation failed');
            }

            attempts++;
        }

        if (!result) {
            throw new Error('D-ID video generation timed out');
        }

        console.log('✅ D-ID video ready:', result.result_url);
        res.json({ videoUrl: result.result_url });

    } catch (error) {
        console.error('D-ID error:', error);
        res.status(500).json({
            error: error.message,
            useStaticAvatar: true
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 API endpoints:`);
    console.log(`   - POST /api/generate-question`);
    console.log(`   - POST /api/generate-feedback`);
    console.log(`   - POST /api/did-talk`);
    console.log(`   - GET  /api/health`);
    console.log(``);

    // Check API key configuration
    if (!process.env.GROQ_API_KEY) {
        console.error(`⚠️  WARNING: GROQ_API_KEY is not set!`);
    } else {
        const keyPreview = process.env.GROQ_API_KEY.slice(0, 6) + '...' + process.env.GROQ_API_KEY.slice(-4);
        console.log(`🔑 Groq API Key loaded: ${keyPreview}`);
        console.log(`   AI features enabled!`);
    }

    // Check D-ID API key
    if (process.env.D_ID_API_KEY) {
        console.log(`🎬 D-ID API Key loaded - Realistic avatar enabled!`);
    } else {
        console.log(`ℹ️  D-ID API Key not set - Using static avatar`);
    }
});
