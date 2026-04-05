use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternMatch {
    pub category: String,
    pub keywords: Vec<String>,
    pub score_weight: u32,
}

pub const KEYWORD_MAPPINGS: &[(&str, &str)] = &[
    ("express", "Backend/Middleware"),
    ("app.get", "Backend/Middleware"),
    ("app.post", "Backend/Middleware"),
    ("router", "Backend/Middleware"),
    ("middleware", "Backend/Middleware"),
    ("useState", "Frontend/Hooks"),
    ("useEffect", "Frontend/Hooks"),
    ("useMemo", "Frontend/Hooks"),
    ("react", "Frontend/Hooks"),
    ("component", "Frontend/Hooks"),
    ("SELECT", "Database/SQL"),
    ("INSERT", "Database/SQL"),
    ("DELETE FROM", "Database/SQL"),
    ("WHERE", "Database/SQL"),
    ("db.", "Database/SQL"),
    ("prisma", "Database/SQL"),
    ("knex", "Database/SQL"),
    ("git", "DevOps/Git"),
    ("commit", "DevOps/Git"),
    ("push", "DevOps/Git"),
    ("docker", "DevOps/Docker"),
    ("container", "DevOps/Docker"),
];

pub fn detect_patterns(content: &str) -> Vec<PatternMatch> {
    let mut matches = std::collections::HashMap::new();
    let content_lower = content.to_lowercase();

    for (keyword, category) in KEYWORD_MAPPINGS {
        if content_lower.contains(&keyword.to_lowercase()) {
            let entry = matches.entry(category.to_string()).or_insert(PatternMatch {
                category: category.to_string(),
                keywords: Vec::new(),
                score_weight: 0,
            });
            entry.keywords.push(keyword.to_string());
            entry.score_weight += 10;
        }
    }

    matches.into_values().collect()
}

pub fn get_pattern_tags_json(content: &str) -> String {
    let patterns = detect_patterns(content);
    let tags: Vec<String> = patterns.into_iter().map(|p| p.category).collect();
    serde_json::to_string(&tags).unwrap_or_else(|_| "[]".to_string())
}
