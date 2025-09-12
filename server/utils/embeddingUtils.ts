import { cleanText } from './cleanText';
import { getEmbeddings } from './bedrock';
import { cosineSimilarity } from './cosine';

export async function groupSimilarTexts(
    texts: string[],
    threshold = 0.85,
    maxGroups?: number
): Promise<{ representative: string; similar_questions: string[]; total_count: number }[]> {
    const cleanedMap = new Map<string, string>();
    const frequencyMap = new Map<string, number>();

    texts.map((text) => {
        const cleaned = cleanText(text);
        if (!cleaned) return;

        cleanedMap.set(cleaned, text);
        frequencyMap.set(cleaned, (frequencyMap.get(cleaned) || 0) + 1);
    });

    const cleanedTexts = Array.from(frequencyMap.keys());
    if (cleanedTexts.length === 0) return [];

    const embeddings = await getEmbeddings(cleanedTexts);
    const used = new Set<number>();
    const clusters: { [key: string]: string[] } = {};

    for (let i = 0; i < embeddings.length; i++) {
        if (used.has(i)) continue;

        const group = [cleanedMap.get(cleanedTexts[i])!];
        used.add(i);

        for (let j = i + 1; j < embeddings.length; j++) {
            if (used.has(j)) continue;
            const sim = cosineSimilarity(embeddings[i], embeddings[j]);
            if (sim >= threshold) {
                group.push(cleanedMap.get(cleanedTexts[j])!);
                used.add(j);
            }
        }

        clusters[group[0]] = group;
    }

    let result = Object.entries(clusters).map(([key, group]) => {
        const total_count = group.reduce(
            (sum, q) => sum + (frequencyMap.get(cleanText(q)) || 0),
            0
        );
        return {
            representative: key,
            similar_questions: group,
            total_count,
        };
    });

    result = result.sort((a, b) => b.total_count - a.total_count);

    if (maxGroups) {
        return result.slice(0, maxGroups);
    }

    return result;
}
