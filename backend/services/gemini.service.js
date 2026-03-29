const axios = require("axios");
const { GEMINI_BASE_URL, MODELS } = require("../config/gemini.config");

async function callGemini(model, prompt) {
    return axios.post(
        `${GEMINI_BASE_URL}/models/${model}:generateContent`,
        {
            contents: [
                {
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 2000
            }
        },
        {
            params: {
                key: process.env.API_KEY1
            },
            headers: {
                "Content-Type": "application/json"
            },
            timeout: 40000
        }
    );
}

exports.generate = async (prompt, preferredModel = MODELS.FAST) => {
    const modelsToTry = [preferredModel, MODELS.FALLBACK];

    for (let model of modelsToTry) {
        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
            attempt += 1;
            const timerLabel = `Gemini-${model}-attempt-${attempt}`;

            try {
                console.time(timerLabel);
                const res = await callGemini(model, prompt);
                console.timeEnd(timerLabel);

                return {
                    modelUsed: model,
                    data: res.data
                };

            } catch (err) {
                console.timeEnd(timerLabel);
                const status = err.response?.status;
                const isTimeout = err.code === "ECONNABORTED";
                const isNetworkError = !err.response;

                console.error(`❌ Model failed: ${model} (attempt ${attempt})`, {
                    status,
                    message: err.message,
                    isNetworkError,
                    isTimeout
                });

                if (status === 429 && attempt < maxAttempts) {
                    const backoff = 500 * attempt;
                    console.warn(`⚠️ Rate limit hit (429), retrying in ${backoff}ms (attempt ${attempt + 1}/${maxAttempts})`);
                    await new Promise((resolve) => setTimeout(resolve, backoff));
                    continue;
                }

                if (status === 429 && attempt >= maxAttempts) {
                    console.error("🚫 Rate limit persisted after retries, moving to next model");
                    break;
                }

                if (isTimeout || isNetworkError || status === 404) {
                    console.warn(`🔁 Retrying with next model (status=${status}, timeout=${isTimeout}, network=${isNetworkError})`);
                    break;
                }

                throw err;
            }
        }
    }

    throw new Error("All Gemini models failed");
};