import { AgentUserPreference } from "@/app/api/data/agent/types"

// Preference to prompt fragment mappings
const AGENT_USER_PREFERENCE_MAPPINGS = {
    communication_style: {
        concise: "Provide concise, direct responses. Focus on key findings without elaboration.",
        detailed: "Provide comprehensive, detailed explanations. Include context and reasoning.",
        balanced: "Balance detail with clarity. Provide key points with supporting context."
    },
    explanation_depth: {
        minimal: "State conclusions without detailed justification unless asked.",
        standard: "Explain your reasoning for significant findings.",
        comprehensive: "Thoroughly explain your analytical process, assumptions, and alternative interpretations."
    },
    risk_perspective: {
        conservative: "Err on the side of caution. Flag potential issues even with moderate suspicion.",
        balanced: "Apply standard risk thresholds. Flag clear indicators while noting uncertainty.",
        risk_tolerant: "Focus on high-confidence findings. Note lower-risk items without overemphasizing."
    },
    output_format: {
        narrative: "Present findings in narrative paragraphs with clear flow.",
        bullet_points: "Use bullet points and lists for clarity and scannability.",
        structured: "Use clear sections with headers, separating facts, analysis, and conclusions."
    },
    use_visual : {
        minimal: "Use minimal visual aids such as charts and ui elements",
        balanced: "Use visual aids such as charts and ui elements to explain key findings",
        maximal: "Use a lot of visual aids such as charts and ui elements to evidence reasoning"
    },
    planning_mode: {
        no_explicit_planning: "No need to make an explict todo list",
        communicate_planning: "For more complex multi-step tasks, the user would like to see a todo list and follow the steps along",
        plan_and_stop_at_each_step: "For more complex multi-step tasks, the user would like to see a todo list and stop and confirm each step"
    }
}

// Boolean preferences
export const AGENT_USER_BOOLEAN_PREFERENCES = {
    'show_confidence_scores': "Always include confidence scores (Low/Medium/High) for your assessments.",
    'show_regulatory_citations': "Reference relevant regulations and compliance requirements when applicable.",
    'highlight_assumptions': "Explicitly state any assumptions you're making in your analysis.",
}

export function generateUserPreferences(preference: AgentUserPreference) {
    
    const header = '# User preferences. \nThe end-user has provided following preferences\n\n'
    const up = [
        AGENT_USER_PREFERENCE_MAPPINGS.communication_style[preference.communication_style],
        AGENT_USER_PREFERENCE_MAPPINGS.explanation_depth[preference.explantion_depth],
        AGENT_USER_PREFERENCE_MAPPINGS.risk_perspective[preference.risk_perspective],
        AGENT_USER_PREFERENCE_MAPPINGS.output_format[preference.output_format],
        AGENT_USER_PREFERENCE_MAPPINGS.use_visual[preference.use_visual],
        AGENT_USER_PREFERENCE_MAPPINGS.planning_mode[preference.planning_mode]
    ].join("\n")

    return header + up
}