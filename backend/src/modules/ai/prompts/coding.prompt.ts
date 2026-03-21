// ── DSA Topics ─────────────────────────────────────────────────
export const DSA_TOPICS = {
  arrays_strings: ['Arrays', 'Strings', 'Two Pointers', 'Sliding Window', 'Prefix Sum'],
  linked_list:    ['Singly Linked List', 'Doubly Linked List', 'Fast & Slow Pointers', 'Merge Lists', 'Cycle Detection'],
  trees_graphs:   ['Binary Tree', 'Binary Search Tree', 'BFS', 'DFS', 'Graph Traversal', 'Topological Sort'],
  dynamic_prog:   ['Fibonacci / Memoization', 'Knapsack', 'Longest Common Subsequence', 'Coin Change', 'Matrix DP'],
  sorting_search: ['Binary Search', 'Merge Sort', 'Quick Sort', 'Search in Rotated Array'],
  stack_queue:    ['Stack', 'Queue', 'Monotonic Stack', 'Priority Queue / Heap'],
  recursion:      ['Backtracking', 'Permutations & Combinations', 'N-Queens', 'Subset Sum'],
  math:           ['Prime Numbers', 'GCD / LCM', 'Bit Manipulation', 'Modular Arithmetic'],
}

export type DSATopicKey = keyof typeof DSA_TOPICS

// ── JD-Based Coding Prompt ─────────────────────────────────────
export function codingPrompt(jd: string, role: string, cfg: any): string {
  const total = Math.ceil((cfg.problemCount || 2) * 2.5)
  const langs = (cfg.allowedLanguages || ['javascript', 'python']).join(', ')

  return `You are a senior software engineer generating coding problems for a ${role} role.

JOB DESCRIPTION:
${jd}

Generate exactly ${total} coding problems directly relevant to the tech stack and responsibilities in the JD.
Difficulty: ${cfg.difficultyEasy || 0}% Easy, ${cfg.difficultyMedium || 50}% Medium, ${cfg.difficultyHard || 50}% Hard.

Rules:
- Problems must relate to real tasks mentioned in the JD (e.g. if JD mentions React, test component logic; if SQL, test query writing)
- Include clear problem statement, input/output format, constraints
- Provide 2 visible examples and 2 visible + 3 hidden test cases
- Provide starter code stubs for: ${langs}
- Hidden test cases should cover edge cases
- Problems should be solvable in a timed interview (not overly complex)

Respond ONLY with valid JSON:
{
  "problems": [
    {
      "type": "CODING",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "e.g. REST API · SQL Query · React Hooks",
      "problemTitle": "string",
      "problemStatement": "full markdown problem description",
      "constraints": "string",
      "examples": [{ "input": "...", "output": "...", "explanation": "..." }],
      "testCases": [{ "input": "...", "expectedOutput": "...", "isHidden": false }],
      "starterCode": { "javascript": "// your code here", "python": "# your code here" }
    }
  ]
}`
}

// ── DSA Coding Prompt ──────────────────────────────────────────
export function dsaPrompt(cfg: any): string {
  const total    = Math.ceil((cfg.problemCount || 2) * 2.5)
  const langs    = (cfg.allowedLanguages || ['javascript', 'python']).join(', ')
  const hasTopics = cfg.dsaTopics?.length > 0

  let topicInstruction = ''
  if (hasTopics) {
    const selected: string[] = cfg.dsaTopics
    topicInstruction = `
Focus ONLY on these selected DSA topics (distribute problems across them):
${selected.map((t: string) => `- ${t}`).join('\n')}
`
  } else {
    topicInstruction = `
Cover a balanced mix across: Arrays, Strings, Linked Lists, Trees, Dynamic Programming, Sorting & Searching, Stack & Queue.
`
  }

  return `You are an expert competitive programming problem setter for corporate technical interviews.

Generate exactly ${total} DSA coding problems.
Difficulty: ${cfg.difficultyEasy || 30}% Easy, ${cfg.difficultyMedium || 40}% Medium, ${cfg.difficultyHard || 30}% Hard.
${topicInstruction}
Rules:
- EASY: single data structure, straightforward implementation (e.g. reverse a string, find max in array)
- MEDIUM: combination of concepts, requires algorithmic thinking (e.g. sliding window, binary search on answer)
- HARD: advanced algorithms, optimisation required (e.g. DP with state compression, graph shortest path)
- Each problem must have a unique, clear title
- Include full problem statement with input/output format
- Provide exactly 2 visible examples and 5 test cases (2 visible + 3 hidden)
- Hidden test cases must include edge cases (empty input, single element, max constraints)
- Provide starter code for: ${langs}
- Time complexity hint should be in the constraints section
- Problems must be well-defined with no ambiguity

Respond ONLY with valid JSON:
{
  "problems": [
    {
      "type": "CODING",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "e.g. Arrays · Binary Search · Dynamic Programming",
      "problemTitle": "string",
      "problemStatement": "full markdown with input/output format",
      "constraints": "1 <= n <= 10^5, Time: O(n log n)",
      "examples": [{ "input": "...", "output": "...", "explanation": "..." }],
      "testCases": [{ "input": "...", "expectedOutput": "...", "isHidden": false }],
      "starterCode": { "javascript": "/**\\n * @param {number[]} nums\\n * @return {number}\\n */\\nfunction solve(nums) {\\n  // your code\\n}", "python": "def solve(nums):\\n    # your code\\n    pass" }
    }
  ]
}`
}