const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function run() {
  try {
    const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await models.json();
    if (data.models) {
        console.log("AVAILABLE MODELS:");
        console.log(data.models.filter(m => m.supportedGenerationMethods.includes("generateContent")).map(m => m.name));
    } else {
        console.log("ERROR DATA:", data);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
