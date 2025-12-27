# Mock AI Interviewer 🤖

An interactive AI-powered mock interview platform designed to help students and professionals practice their technical and behavioral interview skills.

![Project Preview](/api/placeholder/800/400)

## ✨ Features

- **AI-Powered Questions**: Dynamic interview questions powered by Groq AI (Llama 3).
- **Interactive Chat Interface**: Real-time conversation flow with an AI interviewer.
- **Real-time Feedback**: Instant analysis of your answers with improvements.
- **Resume Builder**: Professional templates to create and download resumes (PDF).
- **Resource Library**: Curated guides for STAR method, salary negotiation, and interview tips.
- **Voice Interaction** (Coming Soon): Speech-to-text and text-to-speech capabilities.

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Modern Flexbox/Grid)
- **Backend**: Node.js, Express.js
- **AI Integration**: Groq AI API
- **Tools**: jsPDF (Resume generation), FontAwesome (Icons)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Areeb-Akrami/Mock_Ai_Interview.git
   cd Mock_Ai_Interview
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your Groq API key:
   ```env
   GROQ_API_KEY=your_key_here
   PORT=3000
   ```

4. **Run the server**
   ```bash
   npm start
   ```

5. **Open in Browser**
   Navigate to `http://localhost:3000`

## 📝 Usage

- Select an interview type (Frontend, Backend, HR, etc.) to start a session.
- Type your answers in the chat box or use the microphone (if enabled).
- Check the **Resources** tab for resume templates and quick guides.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📄 License

This project is licensed under the MIT License.
