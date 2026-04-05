use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub workflow: f64,
    pub context: f64,
    pub patterns: f64,
    pub popularity: f64,
    pub ctr_penalty: f64,
}

pub fn calculate_normalized_score(
    workflow: f64, 
    context: f64, 
    patterns: f64, 
    popularity: f64,
    impressions: i32,
    clicks: i32
) -> (u32, ScoreBreakdown) {
    // 1. Calculate CTR Penalty
    let ctr = if impressions > 20 {
        (clicks as f64 / impressions as f64) * 100.0
    } else {
        100.0 // Assume good until 20 impressions
    };

    let ctr_penalty = if ctr < 5.0 {
        15.0 // -15 points for low CTR
    } else if ctr < 10.0 {
        5.0 // -5 points for mediocre CTR
    } else {
        0.0
    };

    // 2. Weights: Workflow(0.5) + Context(0.4) + Patterns(0.3) + Popularity(0.2)
    // Note: Max theoretical = 0.5*100 + 0.4*100 + 0.3*100 + 0.2*100 = 140
    // We normalize this by dividing by the sum of weights (1.4) to get 0-100
    let raw_total = (workflow * 0.5) + (context * 0.4) + (patterns * 0.3) + (popularity * 0.2);
    let mut final_score = (raw_total / 1.4) - ctr_penalty;

    // Clamp
    if final_score > 99.0 { final_score = 99.0; }
    if final_score < 0.0 { final_score = 0.0; }

    (
        final_score as u32,
        ScoreBreakdown {
            workflow: workflow * 0.5,
            context: context * 0.4,
            patterns: patterns * 0.3,
            popularity: popularity * 0.2,
            ctr_penalty,
        }
    )
}
