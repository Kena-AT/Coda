use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    pub title: String,
    pub description: String,
    pub language: String,
    pub content: String,
    pub tag: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendation {
    pub id: String,
    pub title: String,
    pub content: String,
    pub reason: String,
    pub match_percent: u32,
}

#[tauri::command]
pub fn get_templates() -> Vec<Template> {
    vec![
        Template {
            id: "express_route".to_string(),
            title: "Express Route".to_string(),
            description: "Standardized CRUD implementation with protocol middleware and error handling.".to_string(),
            language: "javascript".to_string(),
            content: "const express = require('express');\nconst router = express.Router();\n\nrouter.get('/', async (req, res, next) => {\n  try {\n    // Protocol middleware logic here\n    res.status(200).json({ success: true, data: [] });\n  } catch (err) {\n    next(err);\n  }\n});\n\nmodule.exports = router;".to_string(),
            tag: "#express_rest".to_string(),
        },
        Template {
            id: "react_hook".to_string(),
            title: "React Hook".to_string(),
            description: "State management boilerplate with memoized callbacks and cleanup logic.".to_string(),
            language: "typescript".to_string(),
            content: "import { useState, useEffect, useCallback } from 'react';\n\nexport const useAction = (initialData) => {\n  const [data, setData] = useState(initialData);\n  const [loading, setLoading] = useState(false);\n\n  const execute = useCallback(async () => {\n    setLoading(true);\n    // Execute matrix logic\n    setLoading(false);\n  }, []);\n\n  useEffect(() => {\n    return () => {\n      // Protocol cleanup\n    };\n  }, []);\n\n  return { data, loading, execute };\n};".to_string(),
            tag: "#react_hook".to_string(),
        },
        Template {
            id: "sql_join".to_string(),
            title: "SQL Join".to_string(),
            description: "Optimized many-to-many join with indexing hints for high-load systems.".to_string(),
            language: "sql".to_string(),
            content: "SELECT \n  m.id, \n  m.title,\n  j.target_id\nFROM matrix m\nINNER JOIN junction j ON m.id = j.source_id\nWHERE j.active = 1\n-- Protocol Optimization Hint: Use Index [idx_matrix_junction]\nORDER BY m.created_at DESC;".to_string(),
            tag: "#sql_perf".to_string(),
        },
        Template {
            id: "jwt_auth".to_string(),
            title: "JWT Authenticator".to_string(),
            description: "Robust token validation with refresh cycles and claim verification.".to_string(),
            language: "javascript".to_string(),
            content: "const jwt = require('jsonwebtoken');\n\nconst verifyToken = (token) => {\n  try {\n    const decoded = jwt.verify(token, process.env.JWT_SECRET);\n    // Verify claims against matrix protocol\n    return { valid: true, identity: decoded.sub };\n  } catch (err) {\n    return { valid: false, error: 'ERR_AUTH_REJECTED' };\n  }\n};".to_string(),
            tag: "#auth_gate".to_string(),
        }
    ]
}

#[tauri::command]
pub fn get_smart_recommendations(current_content: String) -> Vec<Recommendation> {
    let mut recs = Vec::new();

    if current_content.contains("@core/system") {
        recs.push(Recommendation {
            id: "metrics_logger".to_string(),
            title: "Metrics Logger".to_string(),
            content: "metrics.log(process.uptime());".to_string(),
            reason: "Detected frequent use of **@core/system**. Recommending performance monitoring snippets.".to_string(),
            match_percent: 98,
        });
    }

    if current_content.to_lowercase().contains("security") || current_content.to_lowercase().contains("input") {
        recs.push(Recommendation {
            id: "sanitization_layer".to_string(),
            title: "Sanitization Layer".to_string(),
            content: "input.replace(/[^a-z0-9]/gi, '');".to_string(),
            reason: "Similar Tag: #Security".to_string(),
            match_percent: 85,
        });
    }

    // Default recommendation if list is empty or just as a fallback
    recs.push(Recommendation {
        id: "health_check".to_string(),
        title: "Health Check".to_string(),
        content: "res.status(200).send('OK');".to_string(),
        reason: "Protocol Default".to_string(),
        match_percent: 100,
    });

    recs
}
