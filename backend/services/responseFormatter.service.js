/**
 * Extracts and formats Gemini API response into user-friendly format
 */

function extractTextFromGeminiResponse(geminiResponse) {
    try {
        // Handle the nested Gemini response structure
        if (geminiResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return geminiResponse.data.candidates[0].content.parts[0].text;
        }
        // Fallback for different response structures
        if (typeof geminiResponse === 'string') {
            return geminiResponse;
        }
        if (geminiResponse?.text) {
            return geminiResponse.text;
        }
        return null;
    } catch (err) {
        console.error("Error extracting text:", err.message);
        return null;
    }
}

function parseAnalysisText(text) {
    try {
        // Handle cases where text may include leading abstract content before actual JSON.
        const jsonStartIndex = text.indexOf("json");
        let cleanedText = text;

        if (jsonStartIndex !== -1) {
            cleanedText = text.slice(jsonStartIndex).replace(/^json\s*/i, "").trim();
        }

        // Strip markdown JSON blocks
        cleanedText = cleanedText.replace(/^```(json)?\s*/i, "").replace(/\s*```$/i, "").trim();

        // If this is raw data with leading context, attempt to extract first JSON object found.
        const objectMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            cleanedText = objectMatch[0];
        }

        const parsed = JSON.parse(cleanedText);
        return parsed;
    } catch (e) {
        console.error("JSON parse error:", e.message, "Text:", text.substring(0, 200));

        // If typical cleaning didn't work, attempt robust failure fallback.
        // Try to find a JSON object substring and parse again.
        try {
            const fallbackObjectMatch = text.match(/\{[\s\S]*\}/);
            if (fallbackObjectMatch) {
                return JSON.parse(fallbackObjectMatch[0]);
            }
        } catch (innerErr) {
            console.error("Fallback parse failed:", innerErr.message);
        }

        // If not JSON, return the raw text as summary.
        return { summary: text.trim() };
    }
}

function formatAnalysisResponse(geminiResponse) {
    const text = extractTextFromGeminiResponse(geminiResponse);

    if (!text) {
        return {
            status: "error",
            message: "Could not extract analysis from API response"
        };
    }

    const parsed = parseAnalysisText(text);

    return {
        status: "success",
        summary: parsed.summary || "Code analysis completed",
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        qualityScore: parsed.qualityScore || "N/A",
        details: parsed
    };
}

function formatSecurityResponse(geminiResponse) {
    const text = extractTextFromGeminiResponse(geminiResponse);

    if (!text) {
        return {
            status: "error",
            vulnerabilities: [],
            riskLevel: "unknown"
        };
    }

    const parsed = parseAnalysisText(text);

    return {
        status: "success",
        riskLevel: parsed.riskLevel || "low",
        vulnerabilities: parsed.vulnerabilities || [],
        recommendations: parsed.recommendations || [],
        details: parsed
    };
}

function formatFinalResponse(analysis, security, filename) {
    return {
        success: true,
        filename: filename,
        timestamp: new Date().toISOString(),
        analysis: {
            type: "code-quality",
            status: analysis.status || "completed",
            summary: analysis.summary,
            issues: analysis.issues,
            recommendations: analysis.recommendations,
            qualityScore: analysis.qualityScore
        },
        security: {
            type: "vulnerability-scan",
            status: security.status || "completed",
            riskLevel: security.riskLevel,
            vulnerabilities: security.vulnerabilities,
            recommendations: security.recommendations
        },
        overallStatus: {
            passed: analysis.issues.length === 0 && security.vulnerabilities.length === 0,
            issuesFound: analysis.issues.length,
            vulnerabilitiesFound: security.vulnerabilities.length,
            actionRequired: analysis.issues.length > 0 || security.vulnerabilities.length > 0
        }
    };
}

module.exports = {
    extractTextFromGeminiResponse,
    parseAnalysisText,
    formatAnalysisResponse,
    formatSecurityResponse,
    formatFinalResponse
};
